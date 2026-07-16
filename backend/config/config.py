"""
Configuration module for Reports AI
No pydantic dependency - uses os.environ directly
"""
import os

class Settings:
    """Simple settings class using os.environ"""

    @property
    def database_url(self):
        return os.environ.get("DATABASE_URL", "")

    @property
    def database_url_admin(self):
        return os.environ.get("DATABASE_URL_ADMIN", "")

    @property
    def db_type(self):
        return os.environ.get("DB_TYPE", "postgresql")

    @property
    def vector_store(self):
        return os.environ.get("VECTOR_STORE", "pgvector")

    @property
    def model_path(self):
        return os.environ.get("MODEL_PATH", "./models/all-MiniLM-L6-v2.onnx")

    @property
    def jwt_secret(self):
        return os.environ.get("JWT_SECRET", "reports-ai-super-secret-key-2026-demo-xyz123")

    @property
    def internal_api_key(self):
        return os.environ.get("INTERNAL_API_KEY", "internal-api-key-for-notifications-2026")

    @property
    def api_base_url(self):
        return os.environ.get("API_BASE_URL", "https://reports-ai.onrender.com")

    @property
    def excel_source_path(self):
        return os.environ.get("EXCEL_SOURCE_PATH", "./data/source_reports.xlsx")

    @property
    def smtp_server(self):
        return os.environ.get("SMTP_SERVER", "smtp.office365.com")

    @property
    def smtp_port(self):
        return int(os.environ.get("SMTP_PORT", "587"))

    @property
    def smtp_user(self):
        return os.environ.get("SMTP_USER", "")

    @property
    def smtp_pass(self):
        return os.environ.get("SMTP_PASS", "")

    @property
    def dev_team_email(self):
        return os.environ.get("DEV_TEAM_EMAIL", "")

# Singleton instance
_settings = None

def get_settings():
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

settings = get_settings()
