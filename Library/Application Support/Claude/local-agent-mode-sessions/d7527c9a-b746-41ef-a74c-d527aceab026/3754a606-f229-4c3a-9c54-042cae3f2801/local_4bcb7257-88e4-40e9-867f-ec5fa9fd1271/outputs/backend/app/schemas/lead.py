from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class LeadCreate(BaseModel):
    concurso_id: UUID
    nome: str
    email: EmailStr
    whatsapp: Optional[str] = None
    cargo: Optional[str] = None
    origem: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None


class LeadResponse(BaseModel):
    id: UUID
    concurso_id: UUID
    nome: str
    email: str
    whatsapp: Optional[str] = None
    status: str
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None

    model_config = {"from_attributes": True}
