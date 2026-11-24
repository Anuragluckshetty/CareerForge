from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CareerForge API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = (
        "postgresql+psycopg://careerforge:careerforge_dev_only"
        "@localhost:5432/careerforge"
    )
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    groq_temperature: float = 0.2
    max_upload_size_mb: int = 10
    jwt_secret_key: str = "development-only-change-me"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

