import uuid

import pytest
from hypothesis import given, settings as h_settings
from hypothesis import strategies as st

from app.core.security import criar_token_jwt, decodificar_token, hash_senha, verificar_senha


# Feature: concurseiro-saas, Property 27: Hash bcrypt fator 12
@given(senha=st.text(min_size=12, max_size=50, alphabet=st.characters(codec="ascii", categories=("L", "N", "P"))))
@h_settings(max_examples=10, deadline=None)
def test_bcrypt_fator_12(senha):
    """Qualquer senha armazenada tem hash comecando com $2b$12$."""
    hashed = hash_senha(senha)
    assert hashed.startswith("$2b$12$")


def test_hash_e_verificacao_consistentes():
    senha = "minha-senha-segura-123"
    hashed = hash_senha(senha)
    assert verificar_senha(senha, hashed) is True
    assert verificar_senha("senha-errada", hashed) is False


def test_token_valido_decodifica():
    admin_id = uuid.uuid4()
    token = criar_token_jwt(admin_id, expires_minutes=60)
    payload = decodificar_token(token)
    assert payload is not None
    assert payload["sub"] == str(admin_id)


def test_token_expirado_retorna_none():
    token = criar_token_jwt(uuid.uuid4(), expires_minutes=-1)
    payload = decodificar_token(token)
    assert payload is None


def test_token_invalido_retorna_none():
    payload = decodificar_token("token.invalido.aqui")
    assert payload is None


# Feature: concurseiro-saas, Property 22: Negacao por padrao
def test_rota_protegida_sem_token_retorna_401():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    # /api/v1/auth/logout requer auth
    response = client.post("/api/v1/auth/logout")
    assert response.status_code in (401, 403)
    assert response.status_code != 200
