"""
Configuration module for Reports AI
Compatible with pydantic v1 (avoids Rust compilation on Render)
"""
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Supabase Database
    database_url: str = ""
    database_url_admin: str = ""

    # Database Config
    db_type: str = "postgresql"
    vector_store: str = "pgvector"

    # AI Model
    model_path: str = "./models/all-MiniLM-L6-v2.onnx"

    # Security
    jwt_secret: str = "reports-ai-super-secret-key-2026-demo-xyz123"
    internal_api_key: str = "internal-api-key-for-notifications-2026"

    # API
    api_base_url: str = "https://reports-ai.onrender.com"

    # Excel Source File
    excel_source_path: str = "./data/source_reports.xlsx"

    # Email (for Contact Dev Team)
    smtp_server: str = "smtp.office365.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    dev_team_email: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Allow extra fields from .env without errors
        extra = "ignore"

# Singleton instance
_settings = None

def get_settings():
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

settings = get_settings()
