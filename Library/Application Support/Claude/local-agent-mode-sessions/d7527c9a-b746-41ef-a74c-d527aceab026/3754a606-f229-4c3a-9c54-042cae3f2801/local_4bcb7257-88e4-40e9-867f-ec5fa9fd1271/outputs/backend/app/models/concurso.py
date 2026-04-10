import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.database import Base


class Concurso(Base):
    __tablename__ = "concursos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False)
    orgao = Column(String(200), nullable=False)
    banca = Column(String(100), nullable=False)
    cidade = Column(String(100))
    estado = Column(String(2))
    vagas = Column(Integer)
    salario_min = Column(Numeric(10, 2))
    salario_max = Column(Numeric(10, 2))
    data_prova = Column(Date)
    data_inscricao_inicio = Column(Date)
    data_inscricao_fim = Column(Date)
    materias = Column(JSONB)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
