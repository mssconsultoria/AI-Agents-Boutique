"""Router para alertas de campanha."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.alerta import Alerta

router = APIRouter(prefix="/api/v1/alertas", tags=["alertas"])


class AlertaOut(BaseModel):
    id: str
    concurso_id: Optional[str] = None
    campanha: str
    tipo: str
    mensagem: str
    status: str

    model_config = {"from_attributes": True}


@router.get("", response_model=List[AlertaOut])
def listar_alertas(
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    alertas = db.query(Alerta).filter(Alerta.status == "ativo").order_by(Alerta.created_at.desc()).all()
    return [
        AlertaOut(
            id=str(a.id),
            concurso_id=str(a.concurso_id) if a.concurso_id else None,
            campanha=a.campanha,
            tipo=a.tipo,
            mensagem=a.mensagem,
            status=a.status,
        )
        for a in alertas
    ]


@router.put("/{alerta_id}/suprimir")
def suprimir_alerta(
    alerta_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    import uuid as _uuid
    try:
        uid = _uuid.UUID(alerta_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    alerta = db.query(Alerta).filter(Alerta.id == uid).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    alerta.status = "suprimido"
    db.commit()
    return {"detail": "Alerta suprimido"}
