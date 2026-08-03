from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "BetterIntra API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra"
    cors_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"

    # Auth / JWT — values required before enabling auth routes
    jwt_secret: str = "dev-only-change-me-to-a-long-random-secret"
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

    # Public API (per-user API keys)
    api_key_rate_limit_per_minute: int = 60

    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
