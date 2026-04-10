import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Concurso, Cupom, Edital, Entrega, Lead, Pedido, Produto


def _criar_concurso(db, slug="craisa-2026"):
    c = Concurso(id=uuid.uuid4(), slug=slug, orgao="CRAISA", banca="Instituto Mais")
    db.add(c)
    db.commit()
    return c


def _criar_produto(db, concurso_id):
    p = Produto(id=uuid.uuid4(), concurso_id=concurso_id, nome="Ebook", preco=37, tipo="ebook")
    db.add(p)
    db.commit()
    return p


def test_kiwify_order_id_unique(db):
    c = _criar_concurso(db)
    p = _criar_produto(db, c.id)
    p1 = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37, kiwify_order_id="ORDER-1")
    p2 = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37, kiwify_order_id="ORDER-1")
    db.add(p1)
    db.commit()
    db.add(p2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_link_token_unique(db):
    c = _criar_concurso(db)
    p = _criar_produto(db, c.id)
    ped = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37)
    db.add(ped)
    db.commit()
    e1 = Entrega(id=uuid.uuid4(), pedido_id=ped.id, canal="email", link_token="TOKEN-ABC")
    e2 = Entrega(id=uuid.uuid4(), pedido_id=ped.id, canal="email", link_token="TOKEN-ABC")
    db.add(e1)
    db.commit()
    db.add(e2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_edital_dedup_unique(db):
    e1 = Edital(id=uuid.uuid4(), orgao="CRAISA", banca="Instituto Mais", ano=2026, numero_edital="01")
    e2 = Edital(id=uuid.uuid4(), orgao="CRAISA", banca="Instituto Mais", ano=2026, numero_edital="01")
    db.add(e1)
    db.commit()
    db.add(e2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_cupom_codigo_unique(db):
    c1 = Cupom(id=uuid.uuid4(), codigo="DESC10")
    c2 = Cupom(id=uuid.uuid4(), codigo="DESC10")
    db.add(c1)
    db.commit()
    db.add(c2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_lead_email_concurso_unique(db):
    c = _criar_concurso(db)
    l1 = Lead(id=uuid.uuid4(), concurso_id=c.id, nome="Joao", email="joao@test.com")
    l2 = Lead(id=uuid.uuid4(), concurso_id=c.id, nome="Joao 2", email="joao@test.com")
    db.add(l1)
    db.commit()
    db.add(l2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_pedido_lead_id_nullable(db):
    c = _criar_concurso(db)
    p = _criar_produto(db, c.id)
    ped = Pedido(id=uuid.uuid4(), produto_id=p.id, valor_bruto=37, lead_id=None)
    db.add(ped)
    db.commit()
    assert ped.lead_id is None
