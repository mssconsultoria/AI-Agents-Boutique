import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(254), unique=True, nullable=False)
    senha_hash = Column(String(60), nullable=False)
    ativo = Column(Boolean, default=True)
    bloqueado_ate = Column(DateTime(timezone=True))
    tentativas_falhas = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
