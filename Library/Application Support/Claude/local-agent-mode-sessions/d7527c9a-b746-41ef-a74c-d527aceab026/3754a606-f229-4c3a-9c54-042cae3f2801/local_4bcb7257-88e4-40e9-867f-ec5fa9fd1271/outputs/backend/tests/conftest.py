import pytest
from sqlalchemy import JSON, String, create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base

# SQLite nao suporta JSONB e UUID do PostgreSQL.
# Registrar adaptadores para que os testes rodem em SQLite.
from sqlalchemy.dialects.postgresql import JSONB, UUID


@event.listens_for(Base.metadata, "column_reflect")
def _setup_sqlite_types(inspector, table, column_info):
    pass


# Monkey-patch: fazer JSONB e UUID renderizarem como JSON e String(36) em SQLite
_orig_jsonb_compile = None
_orig_uuid_compile = None


@pytest.fixture
def db():
    from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"
    SQLiteTypeCompiler.visit_UUID = lambda self, type_, **kw: "VARCHAR(36)"

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
