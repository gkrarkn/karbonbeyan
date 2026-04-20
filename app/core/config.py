from __future__ import annotations

import os
from dataclasses import dataclass


def _split_origins(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _normalize_database_url(value: str) -> str:
    if value.startswith("postgresql+psycopg://") or value.startswith("sqlite"):
        return value
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    return value


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "KarbonBeyan API")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = _normalize_database_url(
        os.getenv("DATABASE_URL", "sqlite:///./karbonbeyan.db")
    )
    allowed_origins: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        origins = os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,https://karbonbeyan.com,https://www.karbonbeyan.com",
        )
        object.__setattr__(self, "allowed_origins", _split_origins(origins))


settings = Settings()
