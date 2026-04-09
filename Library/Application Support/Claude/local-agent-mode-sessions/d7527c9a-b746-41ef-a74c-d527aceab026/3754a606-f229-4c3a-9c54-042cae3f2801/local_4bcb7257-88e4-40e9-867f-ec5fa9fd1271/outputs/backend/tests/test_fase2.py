"""Testes Fase 2: metricas, alertas, testes A/B."""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import CampanhaMetrica, Alerta, TesteAB, Admin
from app.core.security import hash_senha, criar_token_jwt
from app.services.metricas import calcular_metricas
from app.services.alertas import avaliar_alertas
from app.services.estatistica import calcular_significancia, determinar_vencedor
from app.schemas.metrica import CampanhaMetricaCreate

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
        email="admin@test.com",
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


# ─── Property 11: CTR=C/I*100, CPL=G/L, CPA=G/V, ROAS=R/G ─────────

def test_calcular_metricas_basico():
    """Property 11: formulas corretas."""
    result = calcular_metricas(
        gasto=100.0, impressoes=10000, cliques=200,
        leads=50, vendas=10, receita=370.0,
    )
    assert result.ctr == pytest.approx(2.0)       # 200/10000*100
    assert result.cpl == pytest.approx(2.0)        # 100/50
    assert result.cpa == pytest.approx(10.0)       # 100/10
    assert result.roas == pytest.approx(3.7)       # 370/100
    assert result.cpc == pytest.approx(0.5)        # 100/200


def test_calcular_metricas_divisao_por_zero():
    """Property 11: divisao por zero retorna None."""
    result = calcular_metricas(
        gasto=0, impressoes=0, cliques=0,
        leads=0, vendas=0, receita=0,
    )
    assert result.ctr is None
    assert result.cpl is None
    assert result.cpa is None
    assert result.roas is None
    assert result.cpc is None


def test_calcular_metricas_parcial():
    """Property 11: metricas parciais funcionam."""
    result = calcular_metricas(
        gasto=50.0, impressoes=5000, cliques=100,
        leads=0, vendas=0, receita=0,
    )
    assert result.ctr == pytest.approx(2.0)
    assert result.cpl is None  # sem leads
    assert result.cpa is None  # sem vendas
    # roas = receita/gasto = 0/50 = 0.0 (gasto > 0 entao calcula)
    assert result.roas == pytest.approx(0.0)
    assert result.cpc == pytest.approx(0.5)


# ─── Property 12: Funnel invariant validation ───────────────────────

def test_funil_valido():
    """Property 12: dados validos passam validacao."""
    body = CampanhaMetricaCreate(
        campanha="test", data=date.today(),
        impressoes=1000, cliques=200, visitantes_lp=150,
        leads=100, vendas_ebook=5, vendas_pacote=3,
    )
    assert body.cliques <= body.impressoes


def test_funil_cliques_maior_que_impressoes():
    """Property 12: cliques > impressoes rejeitado."""
    with pytest.raises(ValueError, match="cliques"):
        CampanhaMetricaCreate(
            campanha="test", data=date.today(),
            impressoes=100, cliques=200,
        )


def test_funil_visitantes_maior_que_cliques():
    """Property 12: visitantes_lp > cliques rejeitado."""
    with pytest.raises(ValueError, match="visitantes_lp"):
        CampanhaMetricaCreate(
            campanha="test", data=date.today(),
            impressoes=1000, cliques=200, visitantes_lp=300,
        )


def test_funil_leads_maior_que_visitantes():
    """Property 12: leads > visitantes_lp rejeitado."""
    with pytest.raises(ValueError, match="leads"):
        CampanhaMetricaCreate(
            campanha="test", data=date.today(),
            impressoes=1000, cliques=200, visitantes_lp=150, leads=200,
        )


def test_funil_vendas_maior_que_leads():
    """Property 12: vendas > leads rejeitado."""
    with pytest.raises(ValueError, match="vendas"):
        CampanhaMetricaCreate(
            campanha="test", data=date.today(),
            impressoes=1000, cliques=200, visitantes_lp=150,
            leads=10, vendas_ebook=8, vendas_pacote=5,
        )


# ─── Property 14: Alert completeness ────────────────────────────────

def test_alerta_ctr_baixo_gerado(test_db):
    """Property 14: CTR < 0.8% com >= 1000 impressoes gera alerta."""
    # CTR = 5/1000*100 = 0.5% < 0.8%
    m = CampanhaMetrica(
        id=uuid.uuid4(), campanha="camp1", data=date.today(),
        gasto=50, impressoes=1000, cliques=5,
        visitantes_lp=3, leads=2, vendas_ebook=0, vendas_pacote=0, receita=0,
    )
    test_db.add(m)
    test_db.commit()

    alertas = avaliar_alertas(test_db, "camp1", data_referencia=date.today())
    tipos = [a.tipo for a in alertas]
    assert "ctr_baixo" in tipos


def test_alerta_cpl_alto_gerado(test_db):
    """Property 14: CPL > R$2.00 com >= 10 leads gera alerta."""
    # CPL = 50/10 = 5.00 > 2.00
    m = CampanhaMetrica(
        id=uuid.uuid4(), campanha="camp-cpl", data=date.today(),
        gasto=50, impressoes=5000, cliques=500,
        visitantes_lp=100, leads=10, vendas_ebook=2, vendas_pacote=1, receita=100,
    )
    test_db.add(m)
    test_db.commit()

    alertas = avaliar_alertas(test_db, "camp-cpl", data_referencia=date.today())
    tipos = [a.tipo for a in alertas]
    assert "cpl_alto" in tipos


def test_alerta_nao_gerado_volume_insuficiente(test_db):
    """Property 14: volume insuficiente nao gera alerta."""
    # CTR baixo, mas < 1000 impressoes
    m = CampanhaMetrica(
        id=uuid.uuid4(), campanha="camp-low", data=date.today(),
        gasto=10, impressoes=100, cliques=0,
        visitantes_lp=0, leads=0, vendas_ebook=0, vendas_pacote=0, receita=0,
    )
    test_db.add(m)
    test_db.commit()

    alertas = avaliar_alertas(test_db, "camp-low", data_referencia=date.today())
    assert len(alertas) == 0


def test_alerta_campanha_pausada_suprimido(test_db):
    """Property 14: campanha pausada suprime alerta."""
    m = CampanhaMetrica(
        id=uuid.uuid4(), campanha="camp-paused", data=date.today(),
        gasto=50, impressoes=1000, cliques=5,
        visitantes_lp=3, leads=2, vendas_ebook=0, vendas_pacote=0, receita=0,
    )
    test_db.add(m)
    test_db.commit()

    alertas = avaliar_alertas(test_db, "camp-paused", campanha_pausada=True, data_referencia=date.today())
    assert len(alertas) == 0


# ─── Property 15: Alert idempotency ─────────────────────────────────

def test_alerta_idempotencia(test_db):
    """Property 15: N avaliacoes geram no maximo 1 alerta ativo por tipo."""
    m = CampanhaMetrica(
        id=uuid.uuid4(), campanha="camp-idem", data=date.today(),
        gasto=50, impressoes=1000, cliques=5,
        visitantes_lp=3, leads=2, vendas_ebook=0, vendas_pacote=0, receita=0,
    )
    test_db.add(m)
    test_db.commit()

    # Avaliar 3 vezes
    for _ in range(3):
        avaliar_alertas(test_db, "camp-idem", data_referencia=date.today())

    alertas_ativos = test_db.query(Alerta).filter(
        Alerta.campanha == "camp-idem",
        Alerta.tipo == "ctr_baixo",
        Alerta.status == "ativo",
    ).all()
    assert len(alertas_ativos) == 1


# ─── Property 17: A/B determinism ───────────────────────────────────

def test_ab_determinismo():
    """Property 17: mesmos inputs geram mesmo resultado."""
    args = (50, 1000, 60, 1000)
    r1 = calcular_significancia(*args)
    r2 = calcular_significancia(*args)
    assert r1["chi2"] == r2["chi2"]
    assert r1["p_value"] == r2["p_value"]
    assert r1["significativo"] == r2["significativo"]
    assert r1["dados_suficientes"] == r2["dados_suficientes"]


# ─── Property 18: Correct winner ────────────────────────────────────

def test_vencedor_ctr_maior_melhor():
    """Property 18: CTR maior eh melhor, A vence."""
    vencedor = determinar_vencedor("CTR", 3.0, 2.0, significativo=True, dados_suficientes=True)
    assert vencedor == "A"


def test_vencedor_ctr_b_melhor():
    """Property 18: CTR maior eh melhor, B vence."""
    vencedor = determinar_vencedor("CTR", 2.0, 3.0, significativo=True, dados_suficientes=True)
    assert vencedor == "B"


def test_vencedor_cpl_menor_melhor():
    """Property 18: CPL menor eh melhor, A vence."""
    vencedor = determinar_vencedor("CPL", 1.5, 2.5, significativo=True, dados_suficientes=True)
    assert vencedor == "A"


def test_vencedor_cpa_menor_melhor():
    """Property 18: CPA menor eh melhor, B vence."""
    vencedor = determinar_vencedor("CPA", 15.0, 10.0, significativo=True, dados_suficientes=True)
    assert vencedor == "B"


def test_vencedor_nao_significativo():
    """Property 18: sem significancia, sem vencedor."""
    vencedor = determinar_vencedor("CTR", 3.0, 2.0, significativo=False, dados_suficientes=True)
    assert vencedor is None


def test_vencedor_dados_insuficientes():
    """Property 18: dados insuficientes, sem vencedor."""
    vencedor = determinar_vencedor("CTR", 3.0, 2.0, significativo=True, dados_suficientes=False)
    assert vencedor is None


def test_vencedor_roas_maior_melhor():
    """Property 18: ROAS maior eh melhor."""
    vencedor = determinar_vencedor("ROAS", 2.5, 3.5, significativo=True, dados_suficientes=True)
    assert vencedor == "B"


# ─── API Integration Tests ──────────────────────────────────────────

def test_criar_metrica_api(client, test_db, auth_headers):
    """POST /api/v1/metricas cria metrica."""
    r = client.post("/api/v1/metricas", json={
        "campanha": "test-camp",
        "data": "2026-01-15",
        "impressoes": 1000, "cliques": 100,
        "visitantes_lp": 80, "leads": 50,
        "vendas_ebook": 5, "vendas_pacote": 2,
        "gasto": 100, "receita": 259,
    }, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["campanha"] == "test-camp"
    assert data["ctr"] == pytest.approx(10.0)


def test_listar_metricas_api(client, test_db, auth_headers):
    """GET /api/v1/metricas retorna metricas."""
    # Criar uma metrica primeiro
    client.post("/api/v1/metricas", json={
        "campanha": "list-test",
        "data": "2026-01-15",
        "impressoes": 1000, "cliques": 100,
        "visitantes_lp": 80, "leads": 50,
        "vendas_ebook": 5, "vendas_pacote": 2,
        "gasto": 100, "receita": 259,
    }, headers=auth_headers)

    r = client.get("/api/v1/metricas", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_metricas_sem_auth(client):
    """Endpoints de metricas exigem autenticacao."""
    r = client.get("/api/v1/metricas")
    assert r.status_code == 401


def test_listar_alertas_api(client, test_db, auth_headers):
    """GET /api/v1/alertas retorna alertas ativos."""
    alerta = Alerta(
        id=uuid.uuid4(), campanha="camp-api", tipo="ctr_baixo",
        mensagem="Pausar criativo", status="ativo",
    )
    test_db.add(alerta)
    test_db.commit()

    r = client.get("/api/v1/alertas", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_suprimir_alerta_api(client, test_db, auth_headers):
    """PUT /api/v1/alertas/{id}/suprimir suprime alerta."""
    aid = uuid.uuid4()
    alerta = Alerta(
        id=aid, campanha="camp-sup", tipo="cpl_alto",
        mensagem="Revisar publico", status="ativo",
    )
    test_db.add(alerta)
    test_db.commit()

    # Use the hex representation without dashes to match SQLite storage
    aid_str = str(aid)
    r = client.put(f"/api/v1/alertas/{aid_str}/suprimir", headers=auth_headers)
    assert r.status_code == 200
    test_db.refresh(alerta)
    assert alerta.status == "suprimido"


def test_criar_teste_ab_api(client, test_db, auth_headers):
    """POST /api/v1/testes-ab cria teste."""
    r = client.post("/api/v1/testes-ab", json={
        "nome": "Teste Headline",
        "metrica_primaria": "CTR",
        "variante_a": "headline_a",
        "variante_b": "headline_b",
    }, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["nome"] == "Teste Headline"
    assert data["status"] == "ativo"


def test_listar_testes_ab_api(client, test_db, auth_headers):
    """GET /api/v1/testes-ab retorna testes."""
    t = TesteAB(
        id=uuid.uuid4(), nome="Teste List", metrica_primaria="CTR",
        variante_a="a", variante_b="b",
    )
    test_db.add(t)
    test_db.commit()

    r = client.get("/api/v1/testes-ab", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_funil_invalido_api(client, test_db, auth_headers):
    """Property 12 via API: funnel invalido retorna 422."""
    r = client.post("/api/v1/metricas", json={
        "campanha": "bad-funnel",
        "data": "2026-01-15",
        "impressoes": 100, "cliques": 200,
    }, headers=auth_headers)
    assert r.status_code == 422
