"""Testes para APIs: concursos, leads, checkout, entregas."""
import secrets
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from app.database import Base, get_db
from app.main import app
from app.models import Concurso, Entrega, Lead, Pedido, Produto

# Patch SQLite para suportar tipos PostgreSQL
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"
SQLiteTypeCompiler.visit_UUID = lambda self, type_, **kw: "VARCHAR(36)"

# Engine compartilhada para todos os testes neste modulo
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
def client(test_db):
    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _criar_concurso(db, slug="craisa-2026", **kwargs):
    defaults = dict(id=uuid.uuid4(), slug=slug, orgao="CRAISA", banca="Instituto Mais")
    defaults.update(kwargs)
    c = Concurso(**defaults)
    db.add(c)
    db.commit()
    return c


def _criar_produto(db, concurso_id, tipo="ebook", **kwargs):
    defaults = dict(id=uuid.uuid4(), concurso_id=concurso_id, nome="Ebook", preco=37, tipo=tipo)
    defaults.update(kwargs)
    p = Produto(**defaults)
    db.add(p)
    db.commit()
    return p


# ─── Task 6: Concursos ───────────────────────────────────────────────

# Feature: concurseiro-saas, Property 1: Isolamento de tenant
def test_produtos_isolados_por_concurso(client, test_db):
    c1 = _criar_concurso(test_db, slug="c1", orgao="Org1")
    c2 = _criar_concurso(test_db, slug="c2", orgao="Org2")
    _criar_produto(test_db, c1.id, nome="E1")
    _criar_produto(test_db, c2.id, nome="E2")

    r1 = client.get("/api/v1/concursos/c1")
    r2 = client.get("/api/v1/concursos/c2")
    assert r1.status_code == 200
    assert r2.status_code == 200
    ids1 = {p["id"] for p in r1.json()["produtos"]}
    ids2 = {p["id"] for p in r2.json()["produtos"]}
    assert ids1.isdisjoint(ids2)


# Feature: concurseiro-saas, Property 2: Campos obrigatorios
def test_concurso_campos_obrigatorios(client, test_db):
    _criar_concurso(test_db, data_prova=date(2026, 6, 15))
    r = client.get("/api/v1/concursos/craisa-2026")
    data = r.json()
    assert data["orgao"] is not None
    assert data["banca"] is not None
    assert data["data_prova"] is not None


# Feature: concurseiro-saas, Property 3: Countdown
def test_countdown_ativo(client, test_db):
    fim = date.today() + timedelta(days=15)
    _criar_concurso(test_db, slug="countdown", data_inscricao_fim=fim)
    r = client.get("/api/v1/concursos/countdown")
    data = r.json()
    assert data["countdown_ativo"] is True
    assert data["dias_restantes"] == 15


def test_concurso_not_found(client, test_db):
    r = client.get("/api/v1/concursos/nao-existe")
    assert r.status_code == 404


# ─── Task 7: Leads ───────────────────────────────────────────────────

# Feature: concurseiro-saas, Property 4: Validacao de email
def test_email_invalido_rejeitado(client, test_db):
    c = _criar_concurso(test_db, slug="lead-test")
    r = client.post("/api/v1/leads", json={
        "concurso_id": str(c.id), "nome": "Joao", "email": "nao-e-email"
    })
    assert r.status_code == 422


# Feature: concurseiro-saas, Property 28: UTMs preservados
def test_utms_preservados(client, test_db):
    c = _criar_concurso(test_db, slug="utm-test")
    r = client.post("/api/v1/leads", json={
        "concurso_id": str(c.id), "nome": "Maria", "email": "maria@test.com",
        "utm_source": "meta", "utm_medium": "cpc", "utm_campaign": "craisa-ebook",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["utm_source"] == "meta"
    assert data["utm_medium"] == "cpc"
    assert data["utm_campaign"] == "craisa-ebook"


def test_upsert_lead(client, test_db):
    c = _criar_concurso(test_db, slug="upsert-test")
    payload = {"concurso_id": str(c.id), "nome": "Joao", "email": "joao@test.com"}
    r1 = client.post("/api/v1/leads", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/leads", json={**payload, "nome": "Joao Updated"})
    assert r2.status_code == 201
    assert r2.json()["nome"] == "Joao Updated"
    # Apenas 1 lead no banco
    count = test_db.query(Lead).filter_by(email="joao@test.com").count()
    assert count == 1


# ─── Task 8: Checkout ────────────────────────────────────────────────

def test_webhook_idempotencia(client, test_db):
    """Processar mesmo webhook N vezes resulta em exatamente 1 entrega."""
    c = _criar_concurso(test_db, slug="idem-test")
    p = _criar_produto(test_db, c.id)
    order_id = f"KWF-{uuid.uuid4().hex[:8]}"
    payload = {
        "order_id": order_id, "status": "paid",
        "product_id": str(p.id), "customer_email": "test@example.com",
        "customer_name": "Test", "amount": 37.0, "payment_method": "pix",
    }
    for _ in range(3):
        r = client.post("/api/v1/webhooks/kiwify", json=payload)
        assert r.status_code == 200

    pedido = test_db.query(Pedido).filter_by(kiwify_order_id=order_id).first()
    assert pedido is not None
    entregas = test_db.query(Entrega).filter_by(pedido_id=pedido.id).all()
    assert len(entregas) == 1


# Feature: concurseiro-saas, Property 10: WhatsApp para pacote
def test_pacote_gera_entrega_whatsapp(client, test_db):
    c = _criar_concurso(test_db, slug="pacote-test")
    p = _criar_produto(test_db, c.id, tipo="pacote")
    payload = {
        "order_id": "KWF-PACOTE-1", "status": "paid",
        "product_id": str(p.id), "customer_email": "wa@test.com",
        "customer_name": "WA Test", "amount": 97.0, "payment_method": "pix",
    }
    client.post("/api/v1/webhooks/kiwify", json=payload)
    pedido = test_db.query(Pedido).filter_by(kiwify_order_id="KWF-PACOTE-1").first()
    entregas = test_db.query(Entrega).filter_by(pedido_id=pedido.id).all()
    canais = {e.canal for e in entregas}
    assert "email" in canais
    assert "whatsapp" in canais


# Feature: concurseiro-saas, Property 8: Invariante de estado
def test_pedido_entregue_nao_regride():
    from app.services.checkout import atualizar_status_pedido
    pedido = Pedido(id=uuid.uuid4(), produto_id=uuid.uuid4(), valor_bruto=37, status="entregue")
    assert atualizar_status_pedido(pedido, "pendente") is False
    assert pedido.status == "entregue"


# ─── Task 9: Entregas ────────────────────────────────────────────────

def test_link_valido_retorna_redirect(client, test_db):
    c = _criar_concurso(test_db, slug="ent-test")
    p = _criar_produto(test_db, c.id, arquivo_url="https://storage.example.com/ebook.pdf")
    ped = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37, status="pago")
    token = secrets.token_urlsafe(48)
    ent = Entrega(
        id=uuid.uuid4(), pedido_id=ped.id, canal="email",
        link_token=token, status="enviado",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        downloads_count=0, downloads_max=5,
    )
    test_db.add_all([ped, ent])
    test_db.commit()
    r = client.get(f"/api/v1/entregas/{token}", follow_redirects=False)
    assert r.status_code == 302


def test_link_expirado_redireciona(client, test_db):
    c = _criar_concurso(test_db, slug="exp-test")
    p = _criar_produto(test_db, c.id)
    ped = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37, status="pago")
    token = secrets.token_urlsafe(48)
    ent = Entrega(
        id=uuid.uuid4(), pedido_id=ped.id, canal="email",
        link_token=token, status="enviado",
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    test_db.add_all([ped, ent])
    test_db.commit()
    r = client.get(f"/api/v1/entregas/{token}", follow_redirects=False)
    assert r.status_code == 302
    assert "/reenvio" in r.headers["location"]


def test_downloads_esgotados(client, test_db):
    c = _criar_concurso(test_db, slug="dl-test")
    p = _criar_produto(test_db, c.id)
    ped = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37, status="pago")
    token = secrets.token_urlsafe(48)
    ent = Entrega(
        id=uuid.uuid4(), pedido_id=ped.id, canal="email",
        link_token=token, status="enviado",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        downloads_count=5, downloads_max=5,
    )
    test_db.add_all([ped, ent])
    test_db.commit()
    r = client.get(f"/api/v1/entregas/{token}")
    assert r.status_code == 403
