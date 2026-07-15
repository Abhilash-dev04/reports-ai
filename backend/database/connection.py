"""Database connection utilities."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from backend.config import settings

def get_db(admin=False):
    """Get database connection."""
    conn_str = settings.DATABASE_URL_ADMIN if admin else settings.DATABASE_URL
    if not conn_str:
        raise ValueError("Database URL not configured")

    conn = psycopg2.connect(conn_str)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    return cursor

def init_db():
    """Initialize database tables."""
    db = get_db(admin=True)

    # Create pgvector extension
    db.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Create reports table
    db.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            report_id VARCHAR(255) UNIQUE NOT NULL,
            job_name VARCHAR(500),
            report_name VARCHAR(500) NOT NULL,
            functional_area VARCHAR(255),
            package_name VARCHAR(255),
            frequency VARCHAR(100),
            report_type VARCHAR(100),
            state VARCHAR(10) DEFAULT 'AK',
            data_source VARCHAR(50) DEFAULT 'MMIS',
            state VARCHAR(10) DEFAULT 'AK',
            search_text TEXT,
            embedding vector(384),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Create index on embedding
    db.execute("""
        CREATE INDEX IF NOT EXISTS idx_reports_embedding 
        ON reports USING ivfflat (embedding vector_cosine_ops);
    """)

    db.connection.commit()
    db.close()
    print("Database initialized successfully")
