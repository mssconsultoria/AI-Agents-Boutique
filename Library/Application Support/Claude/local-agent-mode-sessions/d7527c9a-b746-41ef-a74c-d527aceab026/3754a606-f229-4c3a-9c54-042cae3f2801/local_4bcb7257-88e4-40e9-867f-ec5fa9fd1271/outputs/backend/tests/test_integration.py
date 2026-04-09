"""Integration tests: full flows end-to-end."""
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Admin, Concurso, Edital, Entrega, Lead, Pedido, Produto
from app.core.security import hash_senha, criar_token_jwt
from app.core.middleware import clear_rate_limit_store

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


@pytest.fixture(autouse=True)
def clean_rate_limits():
    clear_rate_limit_store()
    yield
    clear_rate_limit_store()


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
        slug="concurso-integ",
        orgao="Orgao Integracao",
        banca="Banca Integ",
    )
    test_db.add(c)
    test_db.commit()
    return c


@pytest.fixture
def admin_token(test_db):
    admin = Admin(
        id=uuid.uuid4(),
        email="admin@integ.com",
        senha_hash=hash_senha("senha123"),
        ativo=True,
    )
    test_db.add(admin)
    test_db.commit()
    return criar_token_jwt(admin.id)


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
# Checkout flow integration
# ==========================================


class TestCheckoutFlow:
    """Full checkout: concurso -> produto -> webhook -> pedido -> entrega -> download."""

    def test_full_checkout_flow(self, client, auth_headers, test_db, concurso):
        # 1. Create produto for the concurso
        produto = Produto(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Ebook CRAISA",
            tipo="ebook",
            preco=Decimal("49.90"),
            arquivo_url="https://storage.example.com/ebook.pdf",
        )
        test_db.add(produto)
        test_db.commit()

        # 2. Post webhook (simulating Kiwify payment)
        order_id = f"kiwify-{uuid.uuid4().hex[:12]}"
        webhook_payload = {
            "order_id": order_id,
            "status": "paid",
            "product_id": str(produto.id),
            "customer_email": "comprador@test.com",
            "customer_name": "Comprador Teste",
            "amount": 49.90,
            "payment_method": "pix",
        }
        resp = client.post("/api/v1/webhooks/kiwify", json=webhook_payload)
        assert resp.status_code == 200
        assert resp.json()["status"] == "processed"

        # 3. Verify pedido was created
        pedido = test_db.query(Pedido).filter_by(kiwify_order_id=order_id).first()
        assert pedido is not None
        assert pedido.status == "pago"
        assert float(pedido.valor_bruto) == 49.90

        # 4. Verify entrega was created
        entrega = test_db.query(Entrega).filter_by(pedido_id=pedido.id).first()
        assert entrega is not None
        assert entrega.canal == "email"
        assert entrega.link_token is not None
        assert entrega.downloads_count == 0

        # 5. Verify download works via token
        resp = client.get(
            f"/api/v1/entregas/{entrega.link_token}",
            follow_redirects=False,
        )
        assert resp.status_code == 302
        assert "ebook.pdf" in resp.headers["location"]

        # 6. Verify download count incremented
        test_db.refresh(entrega)
        assert entrega.downloads_count == 1

    def test_idempotent_webhook(self, client, test_db, concurso):
        """Same webhook payload processed twice only creates one pedido."""
        produto = Produto(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Ebook Idempotent",
            tipo="ebook",
            preco=Decimal("29.90"),
            arquivo_url="https://storage.example.com/ebook2.pdf",
        )
        test_db.add(produto)
        test_db.commit()

        order_id = f"kiwify-idem-{uuid.uuid4().hex[:8]}"
        payload = {
            "order_id": order_id,
            "status": "paid",
            "product_id": str(produto.id),
            "customer_email": "idem@test.com",
            "customer_name": "Idempotent Teste",
            "amount": 29.90,
            "payment_method": "credit_card",
        }

        resp1 = client.post("/api/v1/webhooks/kiwify", json=payload)
        assert resp1.status_code == 200

        resp2 = client.post("/api/v1/webhooks/kiwify", json=payload)
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "already_processed"

        # Only one pedido
        pedidos = test_db.query(Pedido).filter_by(kiwify_order_id=order_id).all()
        assert len(pedidos) == 1


# ==========================================
# Lead flow integration
# ==========================================


class TestLeadFlow:
    """Capture lead -> verify -> upsert same email -> verify count=1."""

    def test_lead_capture_and_upsert(self, client, test_db, concurso):
        lead_data = {
            "concurso_id": str(concurso.id),
            "nome": "Maria Silva",
            "email": "maria@test.com",
            "whatsapp": "11999999999",
        }

        # First capture
        resp1 = client.post("/api/v1/leads", json=lead_data)
        assert resp1.status_code == 201
        lead_id = resp1.json()["id"]

        # Verify in DB
        lead = test_db.query(Lead).filter_by(email="maria@test.com", concurso_id=concurso.id).first()
        assert lead is not None
        assert lead.nome == "Maria Silva"

        # Second capture with same email + concurso (upsert)
        lead_data["nome"] = "Maria Silva Updated"
        resp2 = client.post("/api/v1/leads", json=lead_data)
        assert resp2.status_code == 201
        # Same lead ID
        assert resp2.json()["id"] == lead_id
        assert resp2.json()["nome"] == "Maria Silva Updated"

        # Verify count is still 1
        count = test_db.query(Lead).filter_by(
            email="maria@test.com",
            concurso_id=concurso.id,
        ).count()
        assert count == 1


# ==========================================
# Scraper/edital deduplication flow
# ==========================================


class TestEditalDeduplication:
    """Save edital -> save same again -> verify count=1 (dedup)."""

    def test_edital_deduplication(self, test_db):
        edital1 = Edital(
            id=uuid.uuid4(),
            orgao="Prefeitura de Carapicuiba",
            banca="Instituto Mais",
            ano=2024,
            numero_edital="01",
            nome="Concurso Publico CRAISA",
            vagas=50,
        )
        test_db.add(edital1)
        test_db.commit()

        # Try adding same (orgao, banca, ano, numero_edital) combination
        edital2 = Edital(
            id=uuid.uuid4(),
            orgao="Prefeitura de Carapicuiba",
            banca="Instituto Mais",
            ano=2024,
            numero_edital="01",
            nome="Concurso Publico CRAISA v2",
            vagas=60,
        )
        test_db.add(edital2)
        with pytest.raises(Exception):
            test_db.commit()
        test_db.rollback()

        # Verify only 1 edital
        count = test_db.query(Edital).filter_by(
            orgao="Prefeitura de Carapicuiba",
            banca="Instituto Mais",
            ano=2024,
        ).count()
        assert count == 1

    def test_different_edital_allowed(self, test_db):
        """Different edital combination is allowed."""
        edital1 = Edital(
            id=uuid.uuid4(),
            orgao="Prefeitura de Carapicuiba",
            banca="Instituto Mais",
            ano=2024,
            numero_edital="01",
        )
        edital2 = Edital(
            id=uuid.uuid4(),
            orgao="Prefeitura de Carapicuiba",
            banca="Instituto Mais",
            ano=2024,
            numero_edital="02",
        )
        test_db.add_all([edital1, edital2])
        test_db.commit()

        count = test_db.query(Edital).filter_by(
            orgao="Prefeitura de Carapicuiba",
            banca="Instituto Mais",
            ano=2024,
        ).count()
        assert count == 2
