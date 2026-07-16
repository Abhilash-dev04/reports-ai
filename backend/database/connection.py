"""
Database connection module using psycopg v3
"""
import os
import psycopg
from psycopg.rows import dict_row

def get_db(admin=False):
    """Get database connection"""
    conn_str = os.environ.get("DATABASE_URL_ADMIN" if admin else "DATABASE_URL")
    if not conn_str:
        raise ValueError("Database URL not configured")
    return psycopg.connect(conn_str)

def init_db():
    """Initialize database tables"""
    try:
        db = get_db(admin=True)
        cursor = db.cursor()

        # Create reports table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                report_id VARCHAR(100) UNIQUE NOT NULL,
                report_name TEXT,
                job_name VARCHAR(200),
                functional_area VARCHAR(100),
                package_name VARCHAR(200),
                frequency VARCHAR(50),
                report_type VARCHAR(50),
                script_name VARCHAR(200),
                query TEXT,
                filters TEXT,
                state VARCHAR(10),
                data_source VARCHAR(50),
                status VARCHAR(20) DEFAULT 'Active',
                embedding VECTOR(384),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)

        # Create index on embedding
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_reports_embedding 
            ON reports USING ivfflat (embedding vector_cosine_ops)
        """)

        db.commit()
        cursor.close()
        db.close()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database init error: {e}")
        raise
