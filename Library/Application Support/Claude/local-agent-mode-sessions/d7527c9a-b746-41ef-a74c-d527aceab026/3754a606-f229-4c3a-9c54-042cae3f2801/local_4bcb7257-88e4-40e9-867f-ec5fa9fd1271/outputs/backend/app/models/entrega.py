import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Entrega(Base):
    __tablename__ = "entregas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pedido_id = Column(UUID(as_uuid=True), ForeignKey("pedidos.id"), nullable=False)
    canal = Column(String(20), nullable=False)
    status = Column(String(20), default="pendente")
    link_token = Column(String(64), unique=True)
    expires_at = Column(DateTime(timezone=True))
    downloads_count = Column(Integer, default=0)
    downloads_max = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))
    opened_at = Column(DateTime(timezone=True))
