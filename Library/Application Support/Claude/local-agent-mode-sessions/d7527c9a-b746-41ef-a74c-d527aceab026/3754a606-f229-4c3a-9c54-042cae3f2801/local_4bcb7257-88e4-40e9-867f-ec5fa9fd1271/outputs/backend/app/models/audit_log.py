import uuid

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True))
    evento = Column(String(50), nullable=False)
    ip = Column(String(45))
    user_agent = Column(Text)
    detalhes = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
