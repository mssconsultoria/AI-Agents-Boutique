import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("email", "concurso_id", name="uq_leads_email_concurso"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concurso_id = Column(UUID(as_uuid=True), ForeignKey("concursos.id"), nullable=False)
    nome = Column(String(200), nullable=False)
    email = Column(String(254), nullable=False)
    whatsapp = Column(String(20))
    cargo = Column(String(200))
    origem = Column(String(100))
    status = Column(String(50), default="novo")
    utm_source = Column(String(100))
    utm_medium = Column(String(100))
    utm_campaign = Column(String(200))
    utm_content = Column(String(200))
    utm_term = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
