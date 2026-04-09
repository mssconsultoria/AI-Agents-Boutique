from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entrega import Entrega
from app.models.pedido import Pedido
from app.models.produto import Produto

router = APIRouter(prefix="/api/v1/entregas", tags=["entregas"])


@router.get("/{token}")
def download_por_token(token: str, db: Session = Depends(get_db)):
    entrega = db.query(Entrega).filter_by(link_token=token).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Link nao encontrado")

    now = datetime.now(timezone.utc)
    if entrega.expires_at and entrega.expires_at.replace(tzinfo=timezone.utc) < now:
        return RedirectResponse(url=f"/reenvio?token={token}", status_code=302)

    if entrega.downloads_count >= entrega.downloads_max:
        raise HTTPException(status_code=403, detail="Downloads esgotados. Entre em contato.")

    pedido = db.query(Pedido).filter_by(id=entrega.pedido_id).first()
    produto = db.query(Produto).filter_by(id=pedido.produto_id).first()
    if not produto or not produto.arquivo_url:
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")

    entrega.downloads_count += 1
    db.commit()
    return RedirectResponse(url=produto.arquivo_url, status_code=302)
