"""Environment-based application settings. Secrets never have code defaults."""
import os
class Settings:
    database_url = property(lambda self: os.environ.get("DATABASE_URL", "").strip())
    database_url_admin = property(lambda self: os.environ.get("DATABASE_URL_ADMIN", "").strip())
    model_path = property(lambda self: os.environ.get("MODEL_PATH", "./models/all-MiniLM-L6-v2.onnx").strip())
    jwt_secret = property(lambda self: os.environ.get("JWT_SECRET", "").strip())
    api_base_url = property(lambda self: os.environ.get("API_BASE_URL", "http://localhost:8000").strip())
    excel_source_path = property(lambda self: os.environ.get("EXCEL_SOURCE_PATH", "./data/sample_reports.xlsx").strip())
settings = Settings()
def get_settings(): return settings
