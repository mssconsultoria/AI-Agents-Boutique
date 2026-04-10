import uuid

from sqlalchemy import Column, Date, DateTime, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.database import Base


class Edital(Base):
    __tablename__ = "editais"
    __table_args__ = (
        UniqueConstraint("orgao", "banca", "ano", "numero_edital", name="uq_edital_dedup"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    orgao = Column(String(200), nullable=False)
    banca = Column(String(100), nullable=False)
    ano = Column(Integer, nullable=False)
    numero_edital = Column(String(20), default="01")
    nome = Column(String(300))
    vagas = Column(Integer)
    salario_min = Column(Numeric(10, 2))
    salario_max = Column(Numeric(10, 2))
    data_inscricao_inicio = Column(Date)
    data_inscricao_fim = Column(Date)
    data_prova = Column(Date)
    data_resultado = Column(Date)
    materias = Column(JSONB)
    link_original = Column(Text)
    fonte = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
