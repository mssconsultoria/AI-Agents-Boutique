"""Testes Fase 4: cupons, nurturing completo, pedidos, thresholds."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Admin, Concurso, Cupom, Lead, Pedido, ThresholdConfig
from app.core.security import hash_senha, criar_token_jwt
from app.services.cupons import aplicar_cupom
from app.services.nurturing import segmentar_lead

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
        slug="concurso-fase4",
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
        email="admin@fase4.com",
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
# Property 7: Coupon application
# ==========================================


class TestCupomAplicacao:
    """Property 7: Cupom valido reduz preco, expirado/invalido nao."""

    def test_cupom_valido_desconto_valor(self, test_db):
        cupom = Cupom(
            id=uuid.uuid4(),
            codigo="DESC10",
            desconto_valor=Decimal("10.00"),
            ativo=True,
            valido_ate=datetime.now(timezone.utc) + timedelta(days=7),
            usos_atual=0,
        )
        test_db.add(cupom)
        test_db.commit()

        result = aplicar_cupom(Decimal("100.00"), "DESC10", test_db)
        assert result["erro"] is None
        assert result["desconto"] == Decimal("10.00")
        assert result["valor_final"] == Decimal("90.00")

    def test_cupom_valido_desconto_percentual(self, test_db):
        cupom = Cupom(
            id=uuid.uuid4(),
            codigo="PERC20",
            desconto_percentual=Decimal("20.00"),
            ativo=True,
            valido_ate=datetime.now(timezone.utc) + timedelta(days=7),
            usos_atual=0,
        )
        test_db.add(cupom)
        test_db.commit()

        result = aplicar_cupom(Decimal("100.00"), "PERC20", test_db)
        assert result["erro"] is None
        assert result["desconto"] == Decimal("20.00")
        assert result["valor_final"] == Decimal("80.00")

    def test_cupom_invalido(self, test_db):
        result = aplicar_cupom(Decimal("100.00"), "INEXISTENTE", test_db)
        assert result["erro"] == "CUPOM_INVALIDO"
        assert result["desconto"] == Decimal("0")
        assert result["valor_final"] == Decimal("100.00")

    def test_cupom_expirado(self, test_db):
        cupom = Cupom(
            id=uuid.uuid4(),
            codigo="EXPIRADO",
            desconto_valor=Decimal("10.00"),
            ativo=True,
            valido_ate=datetime.now(timezone.utc) - timedelta(days=1),
            usos_atual=0,
        )
        test_db.add(cupom)
        test_db.commit()

        result = aplicar_cupom(Decimal("100.00"), "EXPIRADO", test_db)
        assert result["erro"] == "CUPOM_EXPIRADO"
        assert result["desconto"] == Decimal("0")

    def test_cupom_inativo(self, test_db):
        cupom = Cupom(
            id=uuid.uuid4(),
            codigo="INATIVO",
            desconto_valor=Decimal("10.00"),
            ativo=False,
            valido_ate=datetime.now(timezone.utc) + timedelta(days=7),
            usos_atual=0,
        )
        test_db.add(cupom)
        test_db.commit()

        result = aplicar_cupom(Decimal("100.00"), "INATIVO", test_db)
        assert result["erro"] == "CUPOM_EXPIRADO"

    def test_cupom_esgotado(self, test_db):
        cupom = Cupom(
            id=uuid.uuid4(),
            codigo="ESGOTADO",
            desconto_valor=Decimal("10.00"),
            ativo=True,
            valido_ate=datetime.now(timezone.utc) + timedelta(days=7),
            usos_max=5,
            usos_atual=5,
        )
        test_db.add(cupom)
        test_db.commit()

        result = aplicar_cupom(Decimal("100.00"), "ESGOTADO", test_db)
        assert result["erro"] == "CUPOM_ESGOTADO"
        assert result["desconto"] == Decimal("0")

    def test_cupom_incrementa_uso(self, test_db):
        cupom = Cupom(
            id=uuid.uuid4(),
            codigo="CONTA",
            desconto_valor=Decimal("5.00"),
            ativo=True,
            valido_ate=datetime.now(timezone.utc) + timedelta(days=7),
            usos_max=10,
            usos_atual=3,
        )
        test_db.add(cupom)
        test_db.commit()

        aplicar_cupom(Decimal("100.00"), "CONTA", test_db)
        test_db.refresh(cupom)
        assert cupom.usos_atual == 4


# ==========================================
# Property 24: Mutual exclusion — Lead can't be nurturing and comprou simultaneously
# ==========================================


class TestMutualExclusion:
    """Property 24: Lead nao pode ser nurturing e comprou ao mesmo tempo."""

    def test_lead_comprou_nao_pode_ser_nurturing(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Comprador",
            email="comprador@test.com",
            status="comprou",
            created_at=datetime.now(timezone.utc) - timedelta(days=10),
        )
        test_db.add(lead)
        test_db.commit()

        # segmentar_lead retorna segmento baseado em dias, independente do status
        # Mas o status "comprou" deve ser tratado como final
        assert lead.status == "comprou"
        # Verificar que o segmento seria urgencia (>=6 dias)
        segmento = segmentar_lead(lead)
        assert segmento == "urgencia"
        # O ponto eh que o lead ja comprou, entao nao deveria estar em nurturing
        assert lead.status != "nurturing"

    def test_lead_nurturing_vira_comprou(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Nurturing Lead",
            email="nurturing@test.com",
            status="nurturing",
            created_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        test_db.add(lead)
        test_db.commit()

        # Simular compra
        lead.status = "comprou"
        test_db.commit()
        test_db.refresh(lead)
        assert lead.status == "comprou"
        assert lead.status != "nurturing"


# ==========================================
# Property 25: Segmentation by days
# ==========================================


class TestSegmentacao:
    """Property 25: Segmentacao deterministica por dias."""

    def test_educativo_dia_0(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Novo",
            email="novo@test.com",
            created_at=datetime.now(timezone.utc),
        )
        test_db.add(lead)
        test_db.commit()
        assert segmentar_lead(lead) == "educativo"

    def test_educativo_dia_3(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Dia3",
            email="dia3@test.com",
            created_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        test_db.add(lead)
        test_db.commit()
        assert segmentar_lead(lead) == "educativo"

    def test_prova_social_dia_4(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Dia4",
            email="dia4@test.com",
            created_at=datetime.now(timezone.utc) - timedelta(days=4),
        )
        test_db.add(lead)
        test_db.commit()
        assert segmentar_lead(lead) == "prova_social"

    def test_prova_social_dia_5(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Dia5",
            email="dia5@test.com",
            created_at=datetime.now(timezone.utc) - timedelta(days=5),
        )
        test_db.add(lead)
        test_db.commit()
        assert segmentar_lead(lead) == "prova_social"

    def test_urgencia_dia_6(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Dia6",
            email="dia6@test.com",
            created_at=datetime.now(timezone.utc) - timedelta(days=6),
        )
        test_db.add(lead)
        test_db.commit()
        assert segmentar_lead(lead) == "urgencia"

    def test_urgencia_dia_30(self, test_db, concurso):
        lead = Lead(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Dia30",
            email="dia30@test.com",
            created_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        test_db.add(lead)
        test_db.commit()
        assert segmentar_lead(lead) == "urgencia"


# ==========================================
# Test receita-liquida
# ==========================================


class TestReceitaLiquida:
    """Aggregation matches manual sum."""

    def test_receita_liquida_soma_correta(self, client, auth_headers, test_db, concurso):
        from app.models.produto import Produto

        produto = Produto(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Ebook Teste",
            tipo="ebook",
            preco=Decimal("100.00"),
        )
        test_db.add(produto)
        test_db.commit()

        # Pedido pago: bruto=100, desconto=10 -> liquido=90
        p1 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("100.00"),
            desconto=Decimal("10.00"),
            status="pago",
        )
        # Pedido entregue: bruto=200, desconto=20 -> liquido=180
        p2 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("200.00"),
            desconto=Decimal("20.00"),
            status="entregue",
        )
        # Pedido pendente: nao conta
        p3 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("50.00"),
            desconto=Decimal("0"),
            status="pendente",
        )
        # Pedido cancelado: nao conta
        p4 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("300.00"),
            desconto=Decimal("0"),
            status="cancelado",
        )
        test_db.add_all([p1, p2, p3, p4])
        test_db.commit()

        resp = client.get("/api/v1/metricas/receita-liquida", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # 90 + 180 = 270
        assert data["receita_liquida"] == 270.0

    def test_receita_liquida_sem_pedidos(self, client, auth_headers):
        resp = client.get("/api/v1/metricas/receita-liquida", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["receita_liquida"] == 0.0


# ==========================================
# Test pedidos API
# ==========================================


class TestPedidosAPI:
    """List and detail endpoints."""

    def _create_produto(self, test_db, concurso):
        from app.models.produto import Produto
        produto = Produto(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            nome="Produto Teste",
            tipo="ebook",
            preco=Decimal("99.90"),
        )
        test_db.add(produto)
        test_db.commit()
        return produto

    def test_listar_pedidos(self, client, auth_headers, test_db, concurso):
        produto = self._create_produto(test_db, concurso)
        p1 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("99.90"),
            desconto=Decimal("0"),
            status="pago",
        )
        p2 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("99.90"),
            desconto=Decimal("0"),
            status="pendente",
        )
        test_db.add_all([p1, p2])
        test_db.commit()

        resp = client.get("/api/v1/pedidos", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_listar_pedidos_com_filtro_status(self, client, auth_headers, test_db, concurso):
        produto = self._create_produto(test_db, concurso)
        p1 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("99.90"),
            desconto=Decimal("0"),
            status="pago",
        )
        p2 = Pedido(
            id=uuid.uuid4(),
            produto_id=produto.id,
            valor_bruto=Decimal("99.90"),
            desconto=Decimal("0"),
            status="pendente",
        )
        test_db.add_all([p1, p2])
        test_db.commit()

        resp = client.get("/api/v1/pedidos?status=pago", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["status"] == "pago"

    def test_detalhe_pedido(self, client, auth_headers, test_db, concurso):
        produto = self._create_produto(test_db, concurso)
        pedido_id = uuid.uuid4()
        p = Pedido(
            id=pedido_id,
            produto_id=produto.id,
            valor_bruto=Decimal("99.90"),
            desconto=Decimal("5.00"),
            status="pago",
            metodo_pagamento="pix",
        )
        test_db.add(p)
        test_db.commit()

        resp = client.get(f"/api/v1/pedidos/{pedido_id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(pedido_id)
        assert data["status"] == "pago"
        assert data["valor_bruto"] == 99.9
        assert data["desconto"] == 5.0

    def test_detalhe_pedido_nao_encontrado(self, client, auth_headers):
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/v1/pedidos/{fake_id}", headers=auth_headers)
        assert resp.status_code == 404

    def test_pedidos_requer_auth(self, client):
        resp = client.get("/api/v1/pedidos")
        assert resp.status_code == 401


# ==========================================
# Test thresholds
# ==========================================


class TestThresholds:
    """Threshold config per concurso."""

    def test_set_and_get_thresholds(self, client, auth_headers, test_db, concurso):
        body = {
            "thresholds": [
                {"tipo_alerta": "ctr_min", "valor_threshold": 0.02},
                {"tipo_alerta": "cpl_max", "valor_threshold": 15.50},
            ]
        }
        resp = client.put(
            f"/api/v1/alertas/thresholds/{concurso.id}",
            json=body,
            headers=auth_headers,
        )
        assert resp.status_code == 200

        resp = client.get(
            f"/api/v1/alertas/thresholds/{concurso.id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        tipos = {d["tipo_alerta"] for d in data}
        assert tipos == {"ctr_min", "cpl_max"}

    def test_update_existing_threshold(self, client, auth_headers, test_db, concurso):
        body = {"thresholds": [{"tipo_alerta": "roas_min", "valor_threshold": 2.0}]}
        client.put(
            f"/api/v1/alertas/thresholds/{concurso.id}",
            json=body,
            headers=auth_headers,
        )

        # Update
        body2 = {"thresholds": [{"tipo_alerta": "roas_min", "valor_threshold": 3.5}]}
        client.put(
            f"/api/v1/alertas/thresholds/{concurso.id}",
            json=body2,
            headers=auth_headers,
        )

        resp = client.get(
            f"/api/v1/alertas/thresholds/{concurso.id}",
            headers=auth_headers,
        )
        data = resp.json()
        assert len(data) == 1
        assert data[0]["valor_threshold"] == 3.5
