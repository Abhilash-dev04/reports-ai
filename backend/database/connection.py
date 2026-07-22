"""
Database connection and schema initialization using psycopg v3.
"""

import os

import psycopg
from psycopg.rows import dict_row


def get_db(admin: bool = False, row_factory=None):
    """
    Create and return a PostgreSQL connection.

    admin=True uses DATABASE_URL_ADMIN.
    Otherwise DATABASE_URL is used.
    """

    environment_key = "DATABASE_URL_ADMIN" if admin else "DATABASE_URL"
    connection_string = os.environ.get(environment_key, "").strip()

    if not connection_string:
        raise ValueError(
            f"{environment_key} is not configured"
        )

    connection_options = {}

    if row_factory is not None:
        connection_options["row_factory"] = row_factory

    return psycopg.connect(
        connection_string,
        **connection_options
    )


def init_db():
    """
    Initialize and safely upgrade application database tables.

    This function:
    - Enables pgvector
    - Creates the reports table
    - Adds missing report columns safely
    - Creates the report_requests approval table
    - Creates required indexes
    """

    with get_db(admin=True) as db:
        with db.cursor() as cursor:

            cursor.execute(
                """
                CREATE EXTENSION IF NOT EXISTS vector
                """
            )

            cursor.execute(
                """
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
                    filters TEXT,
                    search_text TEXT,
                    embedding VECTOR(384),
                    record_source VARCHAR(30) NOT NULL DEFAULT 'Excel',
                    approved_by VARCHAR(200),
                    approved_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            # Safely upgrade an existing reports table.
            cursor.execute(
                """
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS job_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS predecessor VARCHAR(100),
                ADD COLUMN IF NOT EXISTS successor VARCHAR(100),
                ADD COLUMN IF NOT EXISTS state VARCHAR(50)
                    DEFAULT 'Active',
                ADD COLUMN IF NOT EXISTS functional_area VARCHAR(100),
                ADD COLUMN IF NOT EXISTS package_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS script_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS output_format VARCHAR(50),
                ADD COLUMN IF NOT EXISTS frequency VARCHAR(50),
                ADD COLUMN IF NOT EXISTS report_type VARCHAR(50),
                ADD COLUMN IF NOT EXISTS report_query TEXT,
                ADD COLUMN IF NOT EXISTS tables_used TEXT,
                ADD COLUMN IF NOT EXISTS data_source VARCHAR(100),
                ADD COLUMN IF NOT EXISTS columns_in_tables TEXT,
                ADD COLUMN IF NOT EXISTS filters TEXT,
                ADD COLUMN IF NOT EXISTS search_text TEXT,
                ADD COLUMN IF NOT EXISTS embedding VECTOR(384),
                ADD COLUMN IF NOT EXISTS record_source VARCHAR(30)
                    NOT NULL DEFAULT 'Excel',
                ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200),
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS report_requests (
                    id SERIAL PRIMARY KEY,

                    original_query TEXT,

                    report_id VARCHAR(50),
                    job_name VARCHAR(100),
                    predecessor VARCHAR(100),
                    successor VARCHAR(100),
                    state VARCHAR(50),

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
                    filters TEXT,

                    requested_by VARCHAR(200),
                    requester_email VARCHAR(320),

                    status VARCHAR(30)
                        NOT NULL DEFAULT 'Pending',

                    reviewed_by VARCHAR(200),
                    review_comments TEXT,
                    reviewed_at TIMESTAMP,

                    database_synced BOOLEAN
                        NOT NULL DEFAULT FALSE,

                    excel_synced BOOLEAN
                        NOT NULL DEFAULT FALSE,

                    sync_error TEXT,
                    sync_attempted_at TIMESTAMP,

                    created_at TIMESTAMP
                        DEFAULT CURRENT_TIMESTAMP,

                    updated_at TIMESTAMP
                        DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT valid_report_request_status
                    CHECK (
                        status IN (
                            'Pending',
                            'Under Review',
                            'Approved',
                            'Rejected',
                            'Sync Failed'
                        )
                    )
                )
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS contact_requests (
                    id SERIAL PRIMARY KEY,
                    original_query TEXT,
                    message TEXT NOT NULL,
                    requested_by VARCHAR(200),
                    requester_email VARCHAR(320),
                    status VARCHAR(30)
                        NOT NULL DEFAULT 'Open',
                    email_sent BOOLEAN
                        NOT NULL DEFAULT FALSE,
                    email_error TEXT,
                    created_at TIMESTAMP
                        DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                        DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT valid_contact_request_status
                    CHECK (
                        status IN (
                            'Open',
                            'In Progress',
                            'Resolved',
                            'Closed'
                        )
                    )
                )
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_embedding
                ON reports
                USING ivfflat (
                    embedding vector_cosine_ops
                )
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_report_id
                ON reports (report_id)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_state
                ON reports (state)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_report_name
                ON reports (report_name)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_job_name
                ON reports (job_name)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_functional_area
                ON reports (functional_area)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_package_name
                ON reports (package_name)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_frequency
                ON reports (frequency)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_reports_data_source
                ON reports (data_source)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_report_requests_status
                ON report_requests (status)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_report_requests_report_id
                ON report_requests (report_id)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_report_requests_created_at
                ON report_requests (created_at DESC)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_contact_requests_status
                ON contact_requests (status)
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
                ON contact_requests (created_at DESC)
                """
            )

        db.commit()

    print("Database initialized successfully")


def database_health_check() -> dict:
    """
    Verify database connectivity and required PostgreSQL extensions.
    """

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    current_database() AS database_name,
                    EXISTS (
                        SELECT 1
                        FROM pg_extension
                        WHERE extname = 'vector'
                    ) AS vector_enabled
                """
            )

            result = cursor.fetchone()

    return {
        "status": "healthy",
        "database_name": result["database_name"],
        "vector_enabled": result["vector_enabled"],
    }


if __name__ == "__main__":
    init_db()
    print(database_health_check())
