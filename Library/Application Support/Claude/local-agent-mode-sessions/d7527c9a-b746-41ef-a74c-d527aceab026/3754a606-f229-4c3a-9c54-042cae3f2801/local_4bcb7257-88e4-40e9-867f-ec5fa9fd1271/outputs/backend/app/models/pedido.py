import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos.id"), nullable=False)
    valor_bruto = Column(Numeric(10, 2), nullable=False)
    desconto = Column(Numeric(10, 2), default=0)
    metodo_pagamento = Column(String(20))
    status = Column(String(30), default="pendente")
    kiwify_order_id = Column(String(100), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
