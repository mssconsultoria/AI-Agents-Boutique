import httpx

from app.core.config import settings


async def disparar_webhook_n8n(evento: str, payload: dict):
    if not settings.n8n_webhook_url:
        return
    url = f"{settings.n8n_webhook_url}/{evento}"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload, timeout=5)
        except httpx.HTTPError:
            pass
