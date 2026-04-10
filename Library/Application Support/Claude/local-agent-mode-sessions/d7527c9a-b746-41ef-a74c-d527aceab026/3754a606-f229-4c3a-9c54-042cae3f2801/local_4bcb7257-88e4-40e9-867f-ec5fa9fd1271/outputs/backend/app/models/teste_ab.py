import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class TesteAB(Base):
    __tablename__ = "testes_ab"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concurso_id = Column(UUID(as_uuid=True), ForeignKey("concursos.id"))
    nome = Column(String(200), nullable=False)
    hipotese = Column(Text)
    metrica_primaria = Column(String(50))
    variante_a = Column(String(200))
    variante_b = Column(String(200))
    vencedor = Column(String(10))
    status = Column(String(20), default="ativo")
    observacoes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    encerrado_at = Column(DateTime(timezone=True))
