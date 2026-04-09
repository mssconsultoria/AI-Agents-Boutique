"""Router para alertas de campanha."""
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.alerta import Alerta
from app.models.threshold_config import ThresholdConfig

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


class ThresholdItem(BaseModel):
    tipo_alerta: str
    valor_threshold: float


class ThresholdUpdate(BaseModel):
    thresholds: List[ThresholdItem]


@router.get("/thresholds/{concurso_id}")
def get_thresholds(
    concurso_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    import uuid as _uuid
    try:
        uid = _uuid.UUID(concurso_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Concurso nao encontrado")
    configs = db.query(ThresholdConfig).filter(ThresholdConfig.concurso_id == uid).all()
    return [
        {
            "id": str(c.id),
            "concurso_id": str(c.concurso_id),
            "tipo_alerta": c.tipo_alerta,
            "valor_threshold": float(c.valor_threshold),
        }
        for c in configs
    ]


@router.put("/thresholds/{concurso_id}")
def set_thresholds(
    concurso_id: str,
    body: ThresholdUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    import uuid as _uuid
    try:
        uid = _uuid.UUID(concurso_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Concurso nao encontrado")

    # Upsert thresholds
    for item in body.thresholds:
        existing = (
            db.query(ThresholdConfig)
            .filter_by(concurso_id=uid, tipo_alerta=item.tipo_alerta)
            .first()
        )
        if existing:
            existing.valor_threshold = item.valor_threshold
        else:
            tc = ThresholdConfig(
                concurso_id=uid,
                tipo_alerta=item.tipo_alerta,
                valor_threshold=item.valor_threshold,
            )
            db.add(tc)
    db.commit()
    return {"detail": "Thresholds atualizados"}
