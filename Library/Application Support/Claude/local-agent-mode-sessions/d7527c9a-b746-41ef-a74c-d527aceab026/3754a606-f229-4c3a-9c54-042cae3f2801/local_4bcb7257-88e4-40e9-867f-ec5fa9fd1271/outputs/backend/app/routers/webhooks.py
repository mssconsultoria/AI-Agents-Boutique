from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.webhook import KiwifyWebhookPayload
from app.services.checkout import processar_webhook

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/kiwify")
async def kiwify_webhook(request: Request, db: Session = Depends(get_db)):
    signature = request.headers.get("X-Kiwify-Signature")
    if signature is not None:
        from app.core.security import verificar_hmac_kiwify
        body_bytes = await request.body()
        if not verificar_hmac_kiwify(body_bytes, signature):
            raise HTTPException(status_code=401, detail="Assinatura invalida")

    body = await request.json()
    payload = KiwifyWebhookPayload(**body)
    return processar_webhook(payload, db)
