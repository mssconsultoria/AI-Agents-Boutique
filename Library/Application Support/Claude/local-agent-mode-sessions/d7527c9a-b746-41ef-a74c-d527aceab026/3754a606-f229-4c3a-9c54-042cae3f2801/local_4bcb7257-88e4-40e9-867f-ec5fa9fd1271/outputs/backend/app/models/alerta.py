import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concurso_id = Column(UUID(as_uuid=True), ForeignKey("concursos.id"))
    campanha = Column(String(200), nullable=False)
    tipo = Column(String(50), nullable=False)
    mensagem = Column(Text, nullable=False)
    status = Column(String(20), default="ativo")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
