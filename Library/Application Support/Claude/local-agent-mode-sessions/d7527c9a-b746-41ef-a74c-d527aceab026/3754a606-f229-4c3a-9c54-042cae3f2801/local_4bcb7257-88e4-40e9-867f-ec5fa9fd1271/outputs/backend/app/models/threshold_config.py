import uuid

from sqlalchemy import Column, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class ThresholdConfig(Base):
    __tablename__ = "threshold_configs"
    __table_args__ = (
        UniqueConstraint("concurso_id", "tipo_alerta", name="uq_threshold_concurso_tipo"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concurso_id = Column(UUID(as_uuid=True), ForeignKey("concursos.id"), nullable=False)
    tipo_alerta = Column(String(50), nullable=False)  # ctr_min, cpl_max, cpa_max, roas_min
    valor_threshold = Column(Numeric(10, 4), nullable=False)
