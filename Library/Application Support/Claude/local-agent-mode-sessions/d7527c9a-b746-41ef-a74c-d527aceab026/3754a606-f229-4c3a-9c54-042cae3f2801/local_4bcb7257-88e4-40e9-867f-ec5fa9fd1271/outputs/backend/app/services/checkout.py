import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entrega import Entrega
from app.models.lead import Lead
from app.models.pedido import Pedido
from app.models.produto import Produto

TRANSICOES_VALIDAS = {
    "pendente": {"pago", "cancelado"},
    "pago": {"entregue", "cancelado", "reembolsado"},
    "entregue": {"reembolsado"},
    "cancelado": set(),
    "reembolsado": set(),
}


def atualizar_status_pedido(pedido: Pedido, novo_status: str) -> bool:
    permitidos = TRANSICOES_VALIDAS.get(pedido.status, set())
    if novo_status not in permitidos:
        return False
    pedido.status = novo_status
    return True


def processar_webhook(payload, db: Session) -> dict:
    # Idempotencia: verificar se ja processado
    pedido = db.query(Pedido).filter_by(kiwify_order_id=payload.order_id).first()
    if pedido and pedido.status in ("entregue", "pago"):
        return {"status": "already_processed"}

    # Buscar lead por email (fix D3: lead_id nullable)
    lead = db.query(Lead).filter_by(email=payload.customer_email).first()
    lead_id = lead.id if lead else None

    if not pedido:
        pedido = Pedido(
            produto_id=UUID(payload.product_id),
            lead_id=lead_id,
            valor_bruto=payload.amount,
            metodo_pagamento=payload.payment_method,
            kiwify_order_id=payload.order_id,
            status="pendente",
        )
        db.add(pedido)
        db.commit()
        db.refresh(pedido)

    if payload.status == "paid":
        atualizar_status_pedido(pedido, "pago")
        # Atualizar status do lead para "comprou"
        if lead and lead.status != "comprou":
            lead.status = "comprou"
        db.commit()

        # Criar entrega (apenas se nao existir)
        existente = db.query(Entrega).filter_by(pedido_id=pedido.id).first()
        if not existente:
            entrega = Entrega(
                pedido_id=pedido.id,
                canal="email",
                link_token=secrets.token_urlsafe(48),
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                status="pendente",
            )
            db.add(entrega)

            # WhatsApp para pacotes (Property 10)
            produto = db.query(Produto).filter_by(id=pedido.produto_id).first()
            if produto and produto.tipo == "pacote":
                entrega_wa = Entrega(
                    pedido_id=pedido.id,
                    canal="whatsapp",
                    link_token=secrets.token_urlsafe(48),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                    status="pendente",
                )
                db.add(entrega_wa)

            db.commit()

    return {"status": "processed"}
