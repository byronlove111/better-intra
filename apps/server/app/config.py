from typing import ClassVar

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "BetterIntra API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra"
    cors_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"

    # Auth / JWT — JWT_SECRET must come from the environment (no code default).
    jwt_secret: str = Field(min_length=16)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # 42 OAuth — fill in apps/server/.env (never commit secrets)
    forty_two_client_id: str = ""
    forty_two_client_secret: str = ""
    forty_two_redirect_uri: str = "http://localhost:8000/auth/callback"
    forty_two_authorize_url: str = "https://api.intra.42.fr/oauth/authorize"
    forty_two_token_url: str = "https://api.intra.42.fr/oauth/token"
    forty_two_api_base_url: str = "https://api.intra.42.fr/v2"

    # Public API rate limit (not an env var — change here if needed)
    api_key_rate_limit_per_minute: ClassVar[int] = 60

    # Local media (avatar / banner uploads)
    media_root: str = "media"
    media_url_prefix: str = "/media"

    # Intra API response cache (Redis). Empty = cache disabled.
    redis_url: str = "redis://localhost:6379/0"

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_from_env(cls, value: str) -> str:
        secret = value.strip()
        placeholders = {
            "dev-only-change-me-to-a-long-random-secret",
            "change-me-generate-a-long-random-secret",
        }
        if not secret or secret in placeholders:
            raise ValueError("JWT_SECRET must be set in the environment (not empty, not a placeholder)")
        return secret

    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
