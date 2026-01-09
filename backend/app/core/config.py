from typing import List, Union, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CourseTwin Lite"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000"
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]

    # Database - Reads from DATABASE_URL environment variable
    # Defaults to SQLite for local development, use PostgreSQL in production (Render)
    DATABASE_URL: str = "sqlite+aiosqlite:///./coursetwin.db"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        # Convert postgresql:// to postgresql+asyncpg:// for async support
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # JWT
    SECRET_KEY: str = "changethis"  # TODO: Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Services
    GROQ_API_KEY: str = ""  # Optional: For quiz generation fallback

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
