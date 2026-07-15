"""Application configuration."""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    DATABASE_URL_ADMIN: str = os.environ.get("DATABASE_URL_ADMIN", "")
    DB_TYPE: str = os.environ.get("DB_TYPE", "postgresql")
    VECTOR_STORE: str = os.environ.get("VECTOR_STORE", "pgvector")

    # AI Model
    MODEL_PATH: str = os.environ.get("MODEL_PATH", "./models/all-MiniLM-L6-v2.onnx")

    # Security
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "reports-ai-super-secret-key-2026-demo")
    INTERNAL_API_KEY: str = os.environ.get("INTERNAL_API_KEY", "internal-api-key-for-cron-jobs-2026")

    # API
    API_BASE_URL: str = os.environ.get("API_BASE_URL", "https://reports-ai.onrender.com")

    # Excel Source
    EXCEL_SOURCE_PATH: str = os.environ.get("EXCEL_SOURCE_PATH", "./data/source_reports.xlsx")

    # Email (for Contact Dev Team)
    SMTP_SERVER: str = os.environ.get("SMTP_SERVER", "smtp.office365.com")
    SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER: str = os.environ.get("SMTP_USER", "")
    SMTP_PASS: str = os.environ.get("SMTP_PASS", "")
    DEV_TEAM_EMAIL: str = os.environ.get("DEV_TEAM_EMAIL", "cognos-dev@company.com")

    # SharePoint (optional)
    SHAREPOINT_SITE: str = os.environ.get("SHAREPOINT_SITE", "")
    SHAREPOINT_FOLDER: str = os.environ.get("SHAREPOINT_FOLDER", "")
    SHAREPOINT_USER: str = os.environ.get("SHAREPOINT_USER", "")
    SHAREPOINT_PASS: str = os.environ.get("SHAREPOINT_PASS", "")

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
