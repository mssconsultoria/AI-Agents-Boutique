from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.concurso import Concurso
from app.models.produto import Produto
from app.schemas.concurso import ConcursoCreate, ConcursoResponse, ProdutoResponse

router = APIRouter(prefix="/api/v1/concursos", tags=["concursos"])


def _build_response(concurso: Concurso, produtos: list) -> dict:
    dias_restantes = None
    countdown_ativo = False
    if concurso.data_inscricao_fim:
        delta = (concurso.data_inscricao_fim - date.today()).days
        if 0 < delta < 30:
            countdown_ativo = True
            dias_restantes = delta

    return ConcursoResponse(
        id=concurso.id,
        slug=concurso.slug,
        orgao=concurso.orgao,
        banca=concurso.banca,
        cidade=concurso.cidade,
        estado=concurso.estado,
        vagas=concurso.vagas,
        salario_min=float(concurso.salario_min) if concurso.salario_min else None,
        salario_max=float(concurso.salario_max) if concurso.salario_max else None,
        data_prova=concurso.data_prova,
        data_inscricao_inicio=concurso.data_inscricao_inicio,
        data_inscricao_fim=concurso.data_inscricao_fim,
        countdown_ativo=countdown_ativo,
        dias_restantes=dias_restantes,
        produtos=[ProdutoResponse.model_validate(p) for p in produtos],
    )


@router.get("/{slug}", response_model=ConcursoResponse)
def get_concurso_by_slug(slug: str, db: Session = Depends(get_db)):
    concurso = db.query(Concurso).filter_by(slug=slug, ativo=True).first()
    if not concurso:
        raise HTTPException(status_code=404, detail="Concurso nao encontrado")
    produtos = db.query(Produto).filter_by(concurso_id=concurso.id, ativo=True).all()
    return _build_response(concurso, produtos)


@router.get("", response_model=List[ConcursoResponse])
def list_concursos(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    concursos = db.query(Concurso).filter_by(ativo=True).all()
    result = []
    for c in concursos:
        produtos = db.query(Produto).filter_by(concurso_id=c.id, ativo=True).all()
        result.append(_build_response(c, produtos))
    return result


@router.post("", status_code=201)
def create_concurso(body: ConcursoCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    concurso = Concurso(**body.model_dump())
    db.add(concurso)
    db.commit()
    db.refresh(concurso)
    return {"id": str(concurso.id), "slug": concurso.slug}


@router.delete("/{concurso_id}")
def delete_concurso(concurso_id: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    concurso = db.query(Concurso).filter_by(id=concurso_id).first()
    if not concurso:
        raise HTTPException(status_code=404)
    concurso.ativo = False
    db.commit()
    return {"detail": "Concurso desativado"}
