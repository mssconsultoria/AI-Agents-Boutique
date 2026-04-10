from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.core.security import criar_token_jwt, verificar_senha
from app.database import get_db
from app.models.admin import Admin
from app.models.audit_log import AuditLog
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter_by(email=body.email).first()
    if not admin or not admin.ativo:
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    now = datetime.now(timezone.utc)
    if admin.bloqueado_ate and admin.bloqueado_ate > now:
        raise HTTPException(status_code=423, detail="Conta bloqueada temporariamente")

    if not verificar_senha(body.senha, admin.senha_hash):
        admin.tentativas_falhas = (admin.tentativas_falhas or 0) + 1
        if admin.tentativas_falhas >= 5:
            admin.bloqueado_ate = now + timedelta(minutes=30)
        db.add(AuditLog(admin_id=admin.id, evento="falha_auth"))
        db.commit()
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    admin.tentativas_falhas = 0
    admin.bloqueado_ate = None
    db.commit()

    token = criar_token_jwt(admin.id)
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, samesite="lax", max_age=8 * 3600,
    )
    db.add(AuditLog(admin_id=admin.id, evento="login"))
    db.commit()
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout(response: Response, admin=Depends(get_current_admin)):
    response.delete_cookie("access_token")
    return {"detail": "Logout realizado"}
