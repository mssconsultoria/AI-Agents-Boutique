"""Router para editais."""
import uuid as uuid_mod
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, String

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.edital import Edital

router = APIRouter(prefix="/api/v1/editais", tags=["editais"])


@router.get("")
def listar_editais(
    banca: Optional[str] = None,
    orgao: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Lista editais com filtros opcionais."""
    q = db.query(Edital)
    if banca:
        q = q.filter(Edital.banca == banca)
    if orgao:
        q = q.filter(Edital.orgao == orgao)
    editais = q.all()
    return [
        {
            "id": str(e.id),
            "orgao": e.orgao,
            "banca": e.banca,
            "ano": e.ano,
            "numero_edital": e.numero_edital,
            "nome": e.nome,
            "vagas": e.vagas,
            "salario_min": float(e.salario_min) if e.salario_min else None,
            "salario_max": float(e.salario_max) if e.salario_max else None,
            "data_prova": str(e.data_prova) if e.data_prova else None,
            "link_original": e.link_original,
        }
        for e in editais
    ]


@router.get("/{edital_id}")
def detalhe_edital(
    edital_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Retorna detalhe de um edital."""
    try:
        uid = uuid_mod.UUID(edital_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Edital nao encontrado")
    edital = db.query(Edital).filter(Edital.id == uid).first()
    if not edital:
        raise HTTPException(status_code=404, detail="Edital nao encontrado")
    return {
        "id": str(edital.id),
        "orgao": edital.orgao,
        "banca": edital.banca,
        "ano": edital.ano,
        "numero_edital": edital.numero_edital,
        "nome": edital.nome,
        "vagas": edital.vagas,
        "salario_min": float(edital.salario_min) if edital.salario_min else None,
        "salario_max": float(edital.salario_max) if edital.salario_max else None,
        "data_inscricao_inicio": str(edital.data_inscricao_inicio) if edital.data_inscricao_inicio else None,
        "data_inscricao_fim": str(edital.data_inscricao_fim) if edital.data_inscricao_fim else None,
        "data_prova": str(edital.data_prova) if edital.data_prova else None,
        "data_resultado": str(edital.data_resultado) if edital.data_resultado else None,
        "materias": edital.materias,
        "link_original": edital.link_original,
    }


@router.post("/scrape")
def trigger_scrape(
    admin=Depends(get_current_admin),
):
    """Dispara scraping manual (mock por enquanto)."""
    return {
        "status": "mock",
        "message": "Scraping simulado — implementacao real em breve",
        "editais_encontrados": 0,
    }
