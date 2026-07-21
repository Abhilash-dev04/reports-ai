"""
Database connection module using psycopg v3
"""

import os
import psycopg


def get_db(admin=False):
    conn_str = os.environ.get(
        "DATABASE_URL_ADMIN" if admin else "DATABASE_URL"
    )

    if not conn_str:
        raise ValueError("Database URL not configured")

    return psycopg.connect(conn_str)


def init_db():
    try:

        db = get_db(admin=True)
        cursor = db.cursor()

        cursor.execute("""
            CREATE EXTENSION IF NOT EXISTS vector;
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (

                id SERIAL PRIMARY KEY,

                report_id VARCHAR(50) UNIQUE NOT NULL,

                job_name VARCHAR(100),

                predecessor VARCHAR(100),

                successor VARCHAR(100),

                state VARCHAR(50) DEFAULT 'Active',

                report_name VARCHAR(200) NOT NULL,

                functional_area VARCHAR(100),

                package_name VARCHAR(100),

                script_name VARCHAR(100),

                output_format VARCHAR(50),

                frequency VARCHAR(50),

                report_type VARCHAR(50),

                report_query TEXT,

                tables_used TEXT,

                data_source VARCHAR(100),

                columns_in_tables TEXT,

                search_text TEXT,

                embedding VECTOR(384),

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_reports_embedding
            ON reports
            USING ivfflat (embedding vector_cosine_ops)
        """)

        db.commit()

        cursor.close()
        db.close()

        print("Database initialized successfully")

    except Exception as e:
        print(f"Database init error: {e}")
        raise
