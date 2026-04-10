from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.models.lead import Lead


async def disparar_webhook_n8n(evento: str, payload: dict):
    if not settings.n8n_webhook_url:
        return
    url = f"{settings.n8n_webhook_url}/{evento}"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload, timeout=5)
        except httpx.HTTPError:
            pass


def segmentar_lead(lead: Lead) -> str:
    """Retorna segmento do lead baseado em dias desde created_at."""
    now = datetime.now(timezone.utc)
    created = lead.created_at
    if created and hasattr(created, 'tzinfo') and created.tzinfo is None:
        # Assume UTC for naive datetimes
        created = created.replace(tzinfo=timezone.utc)
    if created is None:
        created = now
    dias = (now - created).days
    if dias <= 3:
        return "educativo"
    elif dias <= 5:
        return "prova_social"
    else:
        return "urgencia"
