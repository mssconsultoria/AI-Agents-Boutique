from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.concursos import router as concursos_router
from app.routers.leads import router as leads_router
from app.routers.webhooks import router as webhooks_router
from app.routers.entregas import router as entregas_router
from app.routers.metricas import router as metricas_router
from app.routers.alertas import router as alertas_router
from app.routers.testes_ab import router as testes_ab_router
from app.routers.editais import router as editais_router

app = FastAPI(title="Concurseiro SaaS API", version="0.1.0")
app.include_router(auth_router)
app.include_router(concursos_router)
app.include_router(leads_router)
app.include_router(webhooks_router)
app.include_router(entregas_router)
app.include_router(metricas_router)
app.include_router(alertas_router)
app.include_router(testes_ab_router)
app.include_router(editais_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
