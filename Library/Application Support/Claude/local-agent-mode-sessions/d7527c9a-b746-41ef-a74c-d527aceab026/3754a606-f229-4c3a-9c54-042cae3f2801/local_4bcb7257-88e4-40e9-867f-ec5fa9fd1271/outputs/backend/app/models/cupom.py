import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Cupom(Base):
    __tablename__ = "cupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False)
    desconto_valor = Column(Numeric(10, 2))
    desconto_percentual = Column(Numeric(5, 2))
    valido_ate = Column(DateTime(timezone=True))
    ativo = Column(Boolean, default=True)
    usos_max = Column(Integer)
    usos_atual = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
