import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _list(name: str, default: str) -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "").strip()
    redis_url: str = os.getenv("REDIS_URL", "").strip()
    cache_ttl: int = int(os.getenv("CACHE_TTL_SECONDS", "60"))
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
    jwt_expire_hours: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
    admin_username: str = os.getenv("ADMIN_USERNAME", "admin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")
    cors_origins: list[str] = _list(
        "CORS_ORIGINS", "http://localhost,capacitor://localhost,http://localhost:5173,https://localhost"
    )
    data_mode: str = os.getenv("DATA_MODE", "demo").lower()


settings = Settings()
