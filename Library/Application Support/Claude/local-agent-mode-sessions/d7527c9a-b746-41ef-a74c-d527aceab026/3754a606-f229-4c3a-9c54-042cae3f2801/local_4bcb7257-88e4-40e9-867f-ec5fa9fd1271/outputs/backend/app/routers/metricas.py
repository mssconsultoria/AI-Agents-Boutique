"""Router para metricas de campanha."""
import csv
import io
from datetime import date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.campanha_metrica import CampanhaMetrica
from app.models.pedido import Pedido
from app.schemas.metrica import CampanhaMetricaCreate, CampanhaMetricaOut
from app.services.metricas import calcular_metricas

router = APIRouter(prefix="/api/v1/metricas", tags=["metricas"])


def _metrica_to_out(m: CampanhaMetrica) -> dict:
    vendas = (m.vendas_ebook or 0) + (m.vendas_pacote or 0)
    calc = calcular_metricas(
        float(m.gasto or 0),
        m.impressoes or 0,
        m.cliques or 0,
        m.leads or 0,
        vendas,
        float(m.receita or 0),
    )
    return {
        "id": str(m.id),
        "concurso_id": str(m.concurso_id) if m.concurso_id else None,
        "campanha": m.campanha,
        "variante": m.variante,
        "data": m.data,
        "gasto": float(m.gasto or 0),
        "impressoes": m.impressoes or 0,
        "cliques": m.cliques or 0,
        "visitantes_lp": m.visitantes_lp or 0,
        "leads": m.leads or 0,
        "vendas_ebook": m.vendas_ebook or 0,
        "vendas_pacote": m.vendas_pacote or 0,
        "receita": float(m.receita or 0),
        "observacoes": m.observacoes,
        "ctr": calc.ctr,
        "cpl": calc.cpl,
        "cpa": calc.cpa,
        "roas": calc.roas,
        "cpc": calc.cpc,
    }


@router.get("", response_model=List[CampanhaMetricaOut])
def listar_metricas(
    concurso_id: Optional[str] = Query(None),
    campanha: Optional[str] = Query(None),
    variante: Optional[str] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    query = db.query(CampanhaMetrica)
    if concurso_id:
        query = query.filter(CampanhaMetrica.concurso_id == concurso_id)
    if campanha:
        query = query.filter(CampanhaMetrica.campanha == campanha)
    if variante:
        query = query.filter(CampanhaMetrica.variante == variante)
    if data_inicio:
        query = query.filter(CampanhaMetrica.data >= data_inicio)
    if data_fim:
        query = query.filter(CampanhaMetrica.data <= data_fim)

    metricas = query.order_by(CampanhaMetrica.data.desc()).all()
    return [_metrica_to_out(m) for m in metricas]


@router.post("", response_model=CampanhaMetricaOut, status_code=201)
def criar_metrica(
    body: CampanhaMetricaCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    m = CampanhaMetrica(
        campanha=body.campanha,
        concurso_id=body.concurso_id,
        variante=body.variante,
        data=body.data,
        gasto=body.gasto,
        impressoes=body.impressoes,
        cliques=body.cliques,
        visitantes_lp=body.visitantes_lp,
        leads=body.leads,
        vendas_ebook=body.vendas_ebook,
        vendas_pacote=body.vendas_pacote,
        receita=body.receita,
        observacoes=body.observacoes,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _metrica_to_out(m)


@router.post("/importar-csv", status_code=201)
def importar_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    criados = 0
    erros = []
    for i, row in enumerate(reader, start=2):
        try:
            body = CampanhaMetricaCreate(
                campanha=row["campanha"],
                concurso_id=row.get("concurso_id") or None,
                variante=row.get("variante") or None,
                data=row["data"],
                gasto=float(row.get("gasto", 0)),
                impressoes=int(row.get("impressoes", 0)),
                cliques=int(row.get("cliques", 0)),
                visitantes_lp=int(row.get("visitantes_lp", 0)),
                leads=int(row.get("leads", 0)),
                vendas_ebook=int(row.get("vendas_ebook", 0)),
                vendas_pacote=int(row.get("vendas_pacote", 0)),
                receita=float(row.get("receita", 0)),
                observacoes=row.get("observacoes") or None,
            )
            m = CampanhaMetrica(
                campanha=body.campanha,
                concurso_id=body.concurso_id,
                variante=body.variante,
                data=body.data,
                gasto=body.gasto,
                impressoes=body.impressoes,
                cliques=body.cliques,
                visitantes_lp=body.visitantes_lp,
                leads=body.leads,
                vendas_ebook=body.vendas_ebook,
                vendas_pacote=body.vendas_pacote,
                receita=body.receita,
                observacoes=body.observacoes,
            )
            db.add(m)
            criados += 1
        except Exception as e:
            erros.append({"linha": i, "erro": str(e)})

    if criados > 0:
        db.commit()

    return {"criados": criados, "erros": erros}


@router.get("/receita-liquida")
def receita_liquida(
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Receita liquida: SUM(valor_bruto - desconto) para pedidos pagos ou entregues."""
    result = (
        db.query(
            sa_func.coalesce(
                sa_func.sum(Pedido.valor_bruto - sa_func.coalesce(Pedido.desconto, 0)),
                0,
            )
        )
        .filter(Pedido.status.in_(["pago", "entregue"]))
        .scalar()
    )
    return {"receita_liquida": float(result)}
