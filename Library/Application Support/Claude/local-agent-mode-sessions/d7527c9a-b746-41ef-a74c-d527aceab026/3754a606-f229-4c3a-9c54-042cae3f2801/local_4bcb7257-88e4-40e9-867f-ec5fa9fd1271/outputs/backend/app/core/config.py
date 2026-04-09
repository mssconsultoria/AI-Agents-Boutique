from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./test.db"
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_expire_hours: int = 8
    kiwify_webhook_secret: str = ""
    brevo_api_key: str = ""
    zapi_token: str = ""
    n8n_webhook_url: str = ""
    telegram_bot_token: str = ""
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()
