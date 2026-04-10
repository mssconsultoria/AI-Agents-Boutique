"""Testes Fase 5: seguranca, invariantes, rate limiting."""
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Admin, Concurso, Pedido, Produto
from app.models.pedido import Pedido as PedidoModel
from app.core.security import hash_senha, criar_token_jwt
from app.core.middleware import _check_rate_limit, clear_rate_limit_store, _request_log

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
def concurso(test_db):
    c = Concurso(
        id=uuid.uuid4(),
        slug="concurso-fase5",
        orgao="Orgao Teste",
        banca="Banca Teste",
    )
    test_db.add(c)
    test_db.commit()
    return c


@pytest.fixture
def admin_token(test_db):
    admin = Admin(
        id=uuid.uuid4(),
        email="admin@fase5.com",
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


# ==========================================
# Property 26: No card data in Pedido model
# ==========================================


class TestCardDataInvariant:
    """Property 26: Nenhum campo do modelo Pedido armazena dados de cartao."""

    def test_no_card_number_field(self):
        """Verify Pedido has no column that could store credit card numbers."""
        column_names = [col.name for col in PedidoModel.__table__.columns]
        card_related = [
            "card", "cartao", "numero_cartao", "card_number",
            "cvv", "cvc", "expiry", "validade",
        ]
        for col_name in column_names:
            for card_term in card_related:
                assert card_term not in col_name.lower(), (
                    f"Field '{col_name}' in Pedido might store card data"
                )

    def test_pedido_fields_are_safe(self):
        """Verify only expected fields exist in Pedido."""
        column_names = {col.name for col in PedidoModel.__table__.columns}
        expected = {
            "id", "lead_id", "produto_id", "valor_bruto", "desconto",
            "metodo_pagamento", "status", "kiwify_order_id",
            "created_at", "updated_at",
        }
        assert column_names == expected


# ==========================================
# Rate limiting tests (unit-level)
# ==========================================


class TestRateLimiting:
    """Test rate limit logic directly without HTTP state leakage."""

    def setup_method(self):
        clear_rate_limit_store()

    def teardown_method(self):
        clear_rate_limit_store()

    def test_leads_rate_limit_allows_10(self):
        """POST /api/v1/leads allows 10 requests per minute."""
        for i in range(10):
            assert _check_rate_limit("10.0.0.1", "/api/v1/leads", "POST") is True
        # 11th should be blocked
        assert _check_rate_limit("10.0.0.1", "/api/v1/leads", "POST") is False

    def test_login_rate_limit_allows_5(self):
        """POST /api/v1/auth/login allows 5 requests per minute."""
        for i in range(5):
            assert _check_rate_limit("10.0.0.2", "/api/v1/auth/login", "POST") is True
        # 6th should be blocked
        assert _check_rate_limit("10.0.0.2", "/api/v1/auth/login", "POST") is False

    def test_different_ips_independent(self):
        """Different IPs have separate rate limits."""
        for i in range(5):
            _check_rate_limit("10.0.0.3", "/api/v1/auth/login", "POST")
        # IP 3 is blocked
        assert _check_rate_limit("10.0.0.3", "/api/v1/auth/login", "POST") is False
        # IP 4 is still fine
        assert _check_rate_limit("10.0.0.4", "/api/v1/auth/login", "POST") is True

    def test_get_not_rate_limited(self):
        """GET requests are not rate-limited."""
        for i in range(20):
            assert _check_rate_limit("10.0.0.5", "/api/v1/leads", "GET") is True

    def test_rate_limit_429_via_http(self, client):
        """Verify 429 is returned via HTTP after limit exceeded."""
        clear_rate_limit_store()
        # Exhaust login limit
        for i in range(5):
            _check_rate_limit("testclient", "/api/v1/auth/login", "POST")
        # The next HTTP request should get 429
        resp = client.post("/api/v1/auth/login", json={"email": "a@b.com", "senha": "x"})
        assert resp.status_code == 429
        clear_rate_limit_store()
