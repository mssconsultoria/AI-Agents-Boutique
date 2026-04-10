"""Create initial admin from environment variables."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal, Base, engine
from app.models.admin import Admin
from app.core.security import hash_senha


def seed():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    email = os.environ.get("ADMIN_EMAIL", "admin@concurseiro.com")
    password = os.environ.get("ADMIN_PASSWORD", "change-me-now-123")
    existing = db.query(Admin).filter_by(email=email).first()
    if existing:
        print(f"Admin {email} already exists")
        return
    admin = Admin(email=email, senha_hash=hash_senha(password))
    db.add(admin)
    db.commit()
    print(f"Admin {email} created")


if __name__ == "__main__":
    seed()
