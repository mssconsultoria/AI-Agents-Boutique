"""Router para testes A/B."""
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.campanha_metrica import CampanhaMetrica
from app.models.teste_ab import TesteAB
from app.services.estatistica import calcular_significancia, determinar_vencedor
from app.services.metricas import calcular_metricas

router = APIRouter(prefix="/api/v1/testes-ab", tags=["testes-ab"])


class TesteABCreate(BaseModel):
    concurso_id: Optional[str] = None
    nome: str
    hipotese: Optional[str] = None
    metrica_primaria: str
    variante_a: str
    variante_b: str


class TesteABOut(BaseModel):
    id: str
    concurso_id: Optional[str] = None
    nome: str
    hipotese: Optional[str] = None
    metrica_primaria: str
    variante_a: str
    variante_b: str
    vencedor: Optional[str] = None
    status: str
    observacoes: Optional[str] = None

    model_config = {"from_attributes": True}


class TesteABDetail(TesteABOut):
    stats: Optional[dict] = None


@router.get("", response_model=List[TesteABOut])
def listar_testes(
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    testes = db.query(TesteAB).order_by(TesteAB.created_at.desc()).all()
    return [
        TesteABOut(
            id=str(t.id),
            concurso_id=str(t.concurso_id) if t.concurso_id else None,
            nome=t.nome,
            hipotese=t.hipotese,
            metrica_primaria=t.metrica_primaria,
            variante_a=t.variante_a,
            variante_b=t.variante_b,
            vencedor=t.vencedor,
            status=t.status,
            observacoes=t.observacoes,
        )
        for t in testes
    ]


@router.post("", response_model=TesteABOut, status_code=201)
def criar_teste(
    body: TesteABCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    t = TesteAB(
        concurso_id=body.concurso_id,
        nome=body.nome,
        hipotese=body.hipotese,
        metrica_primaria=body.metrica_primaria,
        variante_a=body.variante_a,
        variante_b=body.variante_b,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return TesteABOut(
        id=str(t.id),
        concurso_id=str(t.concurso_id) if t.concurso_id else None,
        nome=t.nome,
        hipotese=t.hipotese,
        metrica_primaria=t.metrica_primaria,
        variante_a=t.variante_a,
        variante_b=t.variante_b,
        vencedor=t.vencedor,
        status=t.status,
        observacoes=t.observacoes,
    )


def _get_stats_for_test(db: Session, teste: TesteAB) -> dict:
    """Calcula estatisticas ao vivo para um teste A/B."""
    campanha = teste.nome

    metricas_a = db.query(CampanhaMetrica).filter(
        CampanhaMetrica.campanha == campanha,
        CampanhaMetrica.variante == teste.variante_a,
    ).all()

    metricas_b = db.query(CampanhaMetrica).filter(
        CampanhaMetrica.campanha == campanha,
        CampanhaMetrica.variante == teste.variante_b,
    ).all()

    def _agregar(metricas):
        gasto = float(sum(float(m.gasto or 0) for m in metricas))
        impressoes = sum(m.impressoes or 0 for m in metricas)
        cliques = sum(m.cliques or 0 for m in metricas)
        leads = sum(m.leads or 0 for m in metricas)
        vendas = sum((m.vendas_ebook or 0) + (m.vendas_pacote or 0) for m in metricas)
        receita = float(sum(float(m.receita or 0) for m in metricas))
        return gasto, impressoes, cliques, leads, vendas, receita

    dados_a = _agregar(metricas_a)
    dados_b = _agregar(metricas_b)

    calc_a = calcular_metricas(*dados_a)
    calc_b = calcular_metricas(*dados_b)

    # Para significancia, usamos conversoes baseadas na metrica primaria
    metrica = teste.metrica_primaria.lower()
    if metrica in ("ctr",):
        conv_a, total_a = dados_a[2], dados_a[1]  # cliques, impressoes
        conv_b, total_b = dados_b[2], dados_b[1]
    elif metrica in ("cpl",):
        conv_a, total_a = dados_a[3], dados_a[2]  # leads, cliques
        conv_b, total_b = dados_b[3], dados_b[2]
    elif metrica in ("cpa",):
        conv_a, total_a = dados_a[4], dados_a[3]  # vendas, leads
        conv_b, total_b = dados_b[4], dados_b[3]
    else:  # roas
        conv_a, total_a = dados_a[4], dados_a[3]
        conv_b, total_b = dados_b[4], dados_b[3]

    sig = calcular_significancia(conv_a, total_a, conv_b, total_b)

    valor_a = getattr(calc_a, metrica)
    valor_b = getattr(calc_b, metrica)

    vencedor = None
    if valor_a is not None and valor_b is not None:
        vencedor = determinar_vencedor(
            metrica, valor_a, valor_b,
            sig["significativo"], sig["dados_suficientes"],
        )

    return {
        "variante_a": {"metricas": calc_a.__dict__, "total": dados_a},
        "variante_b": {"metricas": calc_b.__dict__, "total": dados_b},
        "significancia": sig,
        "vencedor_sugerido": vencedor,
    }


@router.get("/{teste_id}", response_model=TesteABDetail)
def detalhe_teste(
    teste_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    import uuid as _uuid
    try:
        uid = _uuid.UUID(teste_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Teste nao encontrado")
    t = db.query(TesteAB).filter(TesteAB.id == uid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teste nao encontrado")

    stats = _get_stats_for_test(db, t) if t.status == "ativo" else None

    return TesteABDetail(
        id=str(t.id),
        concurso_id=str(t.concurso_id) if t.concurso_id else None,
        nome=t.nome,
        hipotese=t.hipotese,
        metrica_primaria=t.metrica_primaria,
        variante_a=t.variante_a,
        variante_b=t.variante_b,
        vencedor=t.vencedor,
        status=t.status,
        observacoes=t.observacoes,
        stats=stats,
    )


@router.put("/{teste_id}/encerrar")
def encerrar_teste(
    teste_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    import uuid as _uuid
    try:
        uid = _uuid.UUID(teste_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Teste nao encontrado")
    t = db.query(TesteAB).filter(TesteAB.id == uid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teste nao encontrado")
    if t.status != "ativo":
        raise HTTPException(status_code=400, detail="Teste ja encerrado")

    stats = _get_stats_for_test(db, t)
    t.vencedor = stats["vencedor_sugerido"]
    t.status = "encerrado"
    t.encerrado_at = datetime.now(timezone.utc)
    db.commit()
    return {"detail": "Teste encerrado", "vencedor": t.vencedor}
