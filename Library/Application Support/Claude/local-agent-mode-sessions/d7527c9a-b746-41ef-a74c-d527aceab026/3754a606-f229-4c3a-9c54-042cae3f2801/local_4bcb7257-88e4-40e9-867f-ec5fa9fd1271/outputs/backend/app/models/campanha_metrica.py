import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class CampanhaMetrica(Base):
    __tablename__ = "campanha_metricas"
    __table_args__ = (
        UniqueConstraint("campanha", "variante", "data", name="uq_campanha_variante_data"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concurso_id = Column(UUID(as_uuid=True), ForeignKey("concursos.id"))
    campanha = Column(String(200), nullable=False)
    variante = Column(String(10))
    data = Column(Date, nullable=False)
    gasto = Column(Numeric(10, 2), default=0)
    impressoes = Column(Integer, default=0)
    cliques = Column(Integer, default=0)
    visitantes_lp = Column(Integer, default=0)
    leads = Column(Integer, default=0)
    vendas_ebook = Column(Integer, default=0)
    vendas_pacote = Column(Integer, default=0)
    receita = Column(Numeric(10, 2), default=0)
    observacoes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
