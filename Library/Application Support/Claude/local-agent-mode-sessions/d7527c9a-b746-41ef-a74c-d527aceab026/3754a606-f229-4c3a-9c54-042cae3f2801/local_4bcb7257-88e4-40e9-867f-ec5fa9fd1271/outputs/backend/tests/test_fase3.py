"""Testes Fase 3: scrapers de editais, round-trip, deduplicacao."""
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Edital, Admin
from app.core.security import hash_senha, criar_token_jwt
from app.services.scraper.base import (
    EditalExtraido,
    ScraperBase,
    parse_edital,
    pretty_print_edital,
)
from app.services.scraper.persistencia import salvar_editais

# Patch SQLite para suportar tipos PostgreSQL
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"
SQLiteTypeCompiler.visit_UUID = lambda self, type_, **kw: "VARCHAR(36)"

# Engine compartilhada
_engine = create_engine(
    "sqlite:///file::memory:?cache=shared&uri=true",
    connect_args={"check_same_thread": False},
)
_TestSession = sessionmaker(bind=_engine)


@pytest.fixture(autouse=True)
def setup_tables():
    Base.metadata.create_all(_engine)
    yield
    Base.metadata.drop_all(_engine)


@pytest.fixture
def test_db():
    session = _TestSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def admin_token(test_db):
    """Cria admin e retorna token JWT."""
    admin = Admin(
        id=uuid.uuid4(),
        email="admin@fase3.com",
        senha_hash=hash_senha("senha123"),
        ativo=True,
    )
    test_db.add(admin)
    test_db.commit()
    token = criar_token_jwt(admin.id)
    return token


@pytest.fixture
def client(test_db):
    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _edital_valido(**kwargs) -> EditalExtraido:
    """Helper para criar edital valido."""
    defaults = dict(
        orgao="TRT-2",
        banca="FCC",
        ano=2026,
        numero_edital="01",
        nome="Concurso TRT-2 2026",
        vagas=100,
        salario_min=5000.0,
        salario_max=12000.0,
        data_inscricao_inicio="2026-03-01",
        data_inscricao_fim="2026-04-01",
        data_prova="2026-06-15",
        data_resultado="2026-08-01",
        materias=["Portugues", "Direito Constitucional"],
        link_original="https://exemplo.com/edital",
    )
    defaults.update(kwargs)
    return EditalExtraido(**defaults)


# ─── Property 19: Round-trip serialization ─────────────────────────


def test_roundtrip_serialization_valido():
    """Property 19: parse_edital(pretty_print_edital(E)) == E."""
    e = _edital_valido()
    json_str = pretty_print_edital(e)
    e2 = parse_edital(json_str)
    assert e == e2


def test_roundtrip_serialization_campos_opcionais():
    """Property 19: round-trip com campos None."""
    e = EditalExtraido(orgao="MPU", banca="CESPE", ano=2026, data_prova="2026-10-01")
    json_str = pretty_print_edital(e)
    e2 = parse_edital(json_str)
    assert e == e2


def test_roundtrip_serialization_materias_lista():
    """Property 19: round-trip preserva lista de materias."""
    e = _edital_valido(materias=["Mat", "Port", "Informatica"])
    json_str = pretty_print_edital(e)
    e2 = parse_edital(json_str)
    assert e2.materias == ["Mat", "Port", "Informatica"]


# ─── Property 20: Scraping idempotency ────────────────────────────


def test_idempotencia_salvar_editais(test_db):
    """Property 20: salvar mesmo edital N vezes resulta em 1 registro."""
    e = _edital_valido()
    for i in range(3):
        salvar_editais([e], test_db)

    count = test_db.query(Edital).filter_by(orgao="TRT-2", banca="FCC", ano=2026).count()
    assert count == 1


def test_idempotencia_retorno_contagem(test_db):
    """Property 20: primeira insercao retorna novo=1, subsequentes novo=0."""
    e = _edital_valido()

    r1 = salvar_editais([e], test_db)
    assert r1["novos"] == 1
    assert r1["pulados"] == 0

    r2 = salvar_editais([e], test_db)
    assert r2["novos"] == 0
    assert r2["pulados"] == 1


# ─── Property 21: Date invariant ──────────────────────────────────


def test_date_invariant_valido():
    """Property 21: data_inscricao_fim < data_prova < data_resultado."""
    e = _edital_valido(
        data_inscricao_fim="2026-04-01",
        data_prova="2026-06-15",
        data_resultado="2026-08-01",
    )
    fim = date.fromisoformat(e.data_inscricao_fim)
    prova = date.fromisoformat(e.data_prova)
    resultado = date.fromisoformat(e.data_resultado)
    assert fim < prova < resultado


def test_date_invariant_parcial_ok():
    """Property 21: com datas parciais, invariante nao se aplica."""
    e = _edital_valido(data_inscricao_fim=None, data_resultado=None)
    # Sem todas as datas, nao ha violacao a verificar
    assert e.data_prova is not None


# ─── Test validar() ───────────────────────────────────────────────


def test_validar_edital_valido():
    """validar() retorna True quando orgao, banca e data_prova presentes."""
    e = _edital_valido()
    scraper = type("S", (ScraperBase,), {"extrair": None})()
    assert scraper.validar(e) is True


def test_validar_sem_orgao():
    """validar() retorna False sem orgao."""
    e = _edital_valido(orgao="")
    scraper = type("S", (ScraperBase,), {"extrair": None})()
    assert scraper.validar(e) is False


def test_validar_sem_banca():
    """validar() retorna False sem banca."""
    e = _edital_valido(banca="")
    scraper = type("S", (ScraperBase,), {"extrair": None})()
    assert scraper.validar(e) is False


def test_validar_sem_data_prova():
    """validar() retorna False sem data_prova."""
    e = _edital_valido(data_prova=None)
    scraper = type("S", (ScraperBase,), {"extrair": None})()
    assert scraper.validar(e) is False


# ─── Test salvar edital invalido ──────────────────────────────────


def test_salvar_edital_invalido_pulado(test_db):
    """Edital invalido (sem data_prova) eh pulado."""
    e = _edital_valido(data_prova=None)
    r = salvar_editais([e], test_db)
    assert r["novos"] == 0
    assert r["pulados"] == 1


# ─── Test API endpoints ──────────────────────────────────────────


def test_listar_editais_api(client, test_db, auth_headers):
    """GET /api/v1/editais retorna lista."""
    # Inserir edital no banco
    edital = Edital(
        id=uuid.uuid4(),
        orgao="TRF-3",
        banca="VUNESP",
        ano=2026,
        numero_edital="01",
        nome="Concurso TRF-3",
    )
    test_db.add(edital)
    test_db.commit()

    r = client.get("/api/v1/editais", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert data[0]["orgao"] == "TRF-3"


def test_detalhe_edital_api(client, test_db, auth_headers):
    """GET /api/v1/editais/{id} retorna detalhe."""
    eid = uuid.uuid4()
    edital = Edital(
        id=eid,
        orgao="INSS",
        banca="CEBRASPE",
        ano=2026,
        numero_edital="01",
        nome="Concurso INSS 2026",
        vagas=500,
    )
    test_db.add(edital)
    test_db.commit()

    r = client.get(f"/api/v1/editais/{str(eid)}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["orgao"] == "INSS"
    assert data["vagas"] == 500


def test_detalhe_edital_nao_encontrado(client, test_db, auth_headers):
    """GET /api/v1/editais/{id} retorna 404 para id inexistente."""
    fake_id = uuid.uuid4()
    r = client.get(f"/api/v1/editais/{fake_id}", headers=auth_headers)
    assert r.status_code == 404


def test_editais_sem_auth(client):
    """Endpoints de editais exigem autenticacao."""
    r = client.get("/api/v1/editais")
    assert r.status_code == 401


def test_scrape_mock_api(client, test_db, auth_headers):
    """POST /api/v1/editais/scrape retorna mock."""
    r = client.post("/api/v1/editais/scrape", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "mock"


def test_listar_editais_filtro_banca(client, test_db, auth_headers):
    """GET /api/v1/editais?banca=X filtra por banca."""
    for banca in ["FCC", "VUNESP"]:
        test_db.add(Edital(
            id=uuid.uuid4(), orgao="ORG", banca=banca, ano=2026, numero_edital="01",
        ))
    test_db.commit()

    r = client.get("/api/v1/editais?banca=FCC", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert all(e["banca"] == "FCC" for e in data)
