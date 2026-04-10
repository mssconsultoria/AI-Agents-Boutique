from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadResponse

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


@router.post("", status_code=201, response_model=LeadResponse)
def capturar_lead(body: LeadCreate, bg: BackgroundTasks, db: Session = Depends(get_db)):
    # Upsert: verificar se lead ja existe para este email+concurso
    existing = db.query(Lead).filter_by(
        email=body.email, concurso_id=body.concurso_id
    ).first()
    if existing:
        # Atualizar campos
        existing.nome = body.nome
        if body.whatsapp:
            existing.whatsapp = body.whatsapp
        db.commit()
        db.refresh(existing)
        return existing

    lead = Lead(**body.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("", response_model=List[LeadResponse])
def list_leads(
    concurso_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = db.query(Lead)
    if concurso_id:
        query = query.filter_by(concurso_id=concurso_id)
    return query.all()


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    lead = db.query(Lead).filter_by(id=lead_id).first()
    if not lead:
        raise HTTPException(status_code=404)
    return lead
