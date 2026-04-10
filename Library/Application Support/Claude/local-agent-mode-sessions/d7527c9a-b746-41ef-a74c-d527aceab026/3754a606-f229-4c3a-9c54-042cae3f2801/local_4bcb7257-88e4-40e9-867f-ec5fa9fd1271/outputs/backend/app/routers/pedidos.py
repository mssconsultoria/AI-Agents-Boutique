"""Router para pedidos."""
import uuid as _uuid
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.pedido import Pedido

router = APIRouter(prefix="/api/v1/pedidos", tags=["pedidos"])


class PedidoOut(BaseModel):
    id: str
    lead_id: Optional[str] = None
    produto_id: str
    valor_bruto: float
    desconto: float
    metodo_pagamento: Optional[str] = None
    status: str
    kiwify_order_id: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("", response_model=List[PedidoOut])
def listar_pedidos(
    status: Optional[str] = Query(None),
    produto_id: Optional[str] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    query = db.query(Pedido)
    if status:
        query = query.filter(Pedido.status == status)
    if produto_id:
        query = query.filter(Pedido.produto_id == produto_id)
    if data_inicio:
        query = query.filter(Pedido.created_at >= data_inicio)
    if data_fim:
        query = query.filter(Pedido.created_at <= data_fim)

    pedidos = query.order_by(Pedido.created_at.desc()).all()
    return [
        PedidoOut(
            id=str(p.id),
            lead_id=str(p.lead_id) if p.lead_id else None,
            produto_id=str(p.produto_id),
            valor_bruto=float(p.valor_bruto or 0),
            desconto=float(p.desconto or 0),
            metodo_pagamento=p.metodo_pagamento,
            status=p.status,
            kiwify_order_id=p.kiwify_order_id,
        )
        for p in pedidos
    ]


@router.get("/{pedido_id}", response_model=PedidoOut)
def detalhe_pedido(
    pedido_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    try:
        uid = _uuid.UUID(pedido_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")
    pedido = db.query(Pedido).filter(Pedido.id == uid).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")
    return PedidoOut(
        id=str(pedido.id),
        lead_id=str(pedido.lead_id) if pedido.lead_id else None,
        produto_id=str(pedido.produto_id),
        valor_bruto=float(pedido.valor_bruto or 0),
        desconto=float(pedido.desconto or 0),
        metodo_pagamento=pedido.metodo_pagamento,
        status=pedido.status,
        kiwify_order_id=pedido.kiwify_order_id,
    )
