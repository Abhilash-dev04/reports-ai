"""Database connection and schema initialization using psycopg v3."""

import os

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()


def get_db(admin: bool = False, row_factory=None):
    """Open a PostgreSQL connection using the configured environment URL."""

    environment_key = "DATABASE_URL_ADMIN" if admin else "DATABASE_URL"
    connection_string = os.environ.get(environment_key, "").strip()
    if not connection_string:
        raise ValueError(f"{environment_key} is not configured")

    options = {}
    if row_factory is not None:
        options["row_factory"] = row_factory

    return psycopg.connect(connection_string, **options)


def _drop_obsolete_report_uniqueness(cursor) -> None:
    """Remove obsolete uniqueness rules that conflict with the final identity.

    The final business identity is:
        Report ID + Report Name + State

    Numeric ``id`` remains the table primary key. This routine removes only
    older unique constraints/indexes that enforce Report ID alone, Report ID +
    State, or Report Name + State.
    """

    # Constraint-backed unique indexes cannot be dropped directly. Discover
    # and remove only UNIQUE constraints whose normalized column sets match a
    # known obsolete business key. The primary key is intentionally excluded.
    cursor.execute(
        """
        SELECT
            constraint_row.conname,
            ARRAY_AGG(attribute.attname ORDER BY key_column.ordinality) AS columns
        FROM pg_constraint AS constraint_row
        JOIN LATERAL UNNEST(constraint_row.conkey)
             WITH ORDINALITY AS key_column(attnum, ordinality)
             ON TRUE
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_row.conrelid
         AND attribute.attnum = key_column.attnum
        WHERE constraint_row.conrelid = 'public.reports'::regclass
          AND constraint_row.contype = 'u'
        GROUP BY constraint_row.conname
        """
    )

    obsolete_column_sets = {
        frozenset(["ReportID"]),
        frozenset(["ReportID", "State"]),
        frozenset(["Report Name", "State"]),
    }

    for constraint_name, columns in cursor.fetchall():
        if frozenset(columns) in obsolete_column_sets:
            cursor.execute(
                "ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS "
                + psycopg.sql.Identifier(constraint_name).as_string(cursor)
            )

    # Remove known standalone unique indexes from earlier iterations. The
    # composite final index and reports_pkey are not included here.
    obsolete_indexes = (
        "reports_report_name_state_uidx",
        "reports_report_id_state_uidx",
        "uq_reports_report_id",
    )

    for index_name in obsolete_indexes:
        cursor.execute(
            psycopg.sql.SQL("DROP INDEX IF EXISTS public.{}").format(
                psycopg.sql.Identifier(index_name)
            )
        )


def init_db():
    """Create and safely upgrade all application tables and indexes."""

    from backend.config.db_columns import quoted_db_column

    report_column = lambda field: quoted_db_column(field, table="reports")
    request_column = lambda field: quoted_db_column(
        field,
        table="report_requests",
    )

    with get_db(admin=True) as db:
        try:
            with db.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        user_id SERIAL PRIMARY KEY,
                        username VARCHAR(100) UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role VARCHAR(30) NOT NULL DEFAULT 'user',
                        email VARCHAR(320),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                cursor.execute(
                    """
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'user',
                    ADD COLUMN IF NOT EXISTS email VARCHAR(320),
                    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    """
                )

                # Do not mark ReportID alone as UNIQUE. The final business key
                # is ReportID + Report Name + State and is created below.
                cursor.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS reports (
                        id SERIAL PRIMARY KEY,
                        {report_column('report_id')} VARCHAR(50) NOT NULL,
                        {report_column('job_name')} VARCHAR(100),
                        {report_column('predecessor')} VARCHAR(100),
                        {report_column('successor')} VARCHAR(100),
                        {report_column('state')} VARCHAR(50) NOT NULL,
                        {report_column('report_name')} VARCHAR(200) NOT NULL,
                        {report_column('functional_area')} VARCHAR(100),
                        {report_column('package_name')} VARCHAR(100),
                        {report_column('script_name')} VARCHAR(100),
                        {report_column('output_format')} VARCHAR(50),
                        {report_column('frequency')} VARCHAR(50),
                        {report_column('report_type')} VARCHAR(50),
                        {report_column('report_query')} TEXT,
                        {report_column('tables_used')} TEXT,
                        {report_column('data_source')} VARCHAR(100),
                        {report_column('columns_in_tables')} TEXT,
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

                cursor.execute(
                    f"""
                    ALTER TABLE reports
                    ADD COLUMN IF NOT EXISTS {report_column('job_name')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('predecessor')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('successor')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('state')} VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS {report_column('functional_area')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('package_name')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('script_name')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('output_format')} VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS {report_column('frequency')} VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS {report_column('report_type')} VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS {report_column('report_query')} TEXT,
                    ADD COLUMN IF NOT EXISTS {report_column('tables_used')} TEXT,
                    ADD COLUMN IF NOT EXISTS {report_column('data_source')} VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS {report_column('columns_in_tables')} TEXT,
                    ADD COLUMN IF NOT EXISTS search_text TEXT,
                    ADD COLUMN IF NOT EXISTS embedding VECTOR(384),
                    ADD COLUMN IF NOT EXISTS record_source VARCHAR(30) NOT NULL DEFAULT 'Excel',
                    ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200),
                    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    """
                )

                cursor.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS report_requests (
                        id SERIAL PRIMARY KEY,
                        original_query TEXT,
                        {request_column('report_id')} VARCHAR(50),
                        {request_column('job_name')} VARCHAR(100),
                        {request_column('predecessor')} VARCHAR(100),
                        {request_column('successor')} VARCHAR(100),
                        {request_column('state')} VARCHAR(50),
                        {request_column('report_name')} VARCHAR(200) NOT NULL,
                        {request_column('functional_area')} VARCHAR(100),
                        {request_column('package_name')} VARCHAR(100),
                        {request_column('script_name')} VARCHAR(100),
                        {request_column('output_format')} VARCHAR(50),
                        {request_column('frequency')} VARCHAR(50),
                        {request_column('report_type')} VARCHAR(50),
                        {request_column('report_query')} TEXT,
                        {request_column('tables_used')} TEXT,
                        {request_column('data_source')} VARCHAR(100),
                        {request_column('columns_in_tables')} TEXT,
                        requested_by VARCHAR(200),
                        requester_email VARCHAR(320),
                        status VARCHAR(30) NOT NULL DEFAULT 'Pending',
                        reviewed_by VARCHAR(200),
                        review_comments TEXT,
                        reviewed_at TIMESTAMP,
                        database_synced BOOLEAN NOT NULL DEFAULT FALSE,
                        excel_synced BOOLEAN NOT NULL DEFAULT FALSE,
                        sync_error TEXT,
                        sync_attempted_at TIMESTAMP,
                        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
                        email_error TEXT,
                        email_sent_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT valid_report_request_status CHECK (
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
                    ALTER TABLE report_requests
                    ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS email_error TEXT,
                    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP
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
                        status VARCHAR(30) NOT NULL DEFAULT 'Open',
                        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
                        email_error TEXT,
                        email_sent_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT valid_contact_request_status CHECK (
                            status IN ('Open', 'In Progress', 'Resolved', 'Closed')
                        )
                    )
                    """
                )

                cursor.execute(
                    """
                    ALTER TABLE contact_requests
                    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP
                    """
                )

                _drop_obsolete_report_uniqueness(cursor)

                indexes = [
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username)",
                    "CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)",
                    f"""
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_report_id_name_state
                    ON reports (
                        {report_column('report_id')},
                        {report_column('report_name')},
                        {report_column('state')}
                    )
                    """,
                    "CREATE INDEX IF NOT EXISTS idx_reports_embedding ON reports USING ivfflat (embedding vector_cosine_ops)",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_report_id ON reports ({report_column('report_id')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_state ON reports ({report_column('state')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_report_name ON reports ({report_column('report_name')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_job_name ON reports ({report_column('job_name')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_functional_area ON reports ({report_column('functional_area')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_package_name ON reports ({report_column('package_name')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_frequency ON reports ({report_column('frequency')})",
                    f"CREATE INDEX IF NOT EXISTS idx_reports_data_source ON reports ({report_column('data_source')})",
                    "CREATE INDEX IF NOT EXISTS idx_report_requests_status ON report_requests (status)",
                    f"CREATE INDEX IF NOT EXISTS idx_report_requests_report_id ON report_requests ({request_column('report_id')})",
                    "CREATE INDEX IF NOT EXISTS idx_report_requests_created_at ON report_requests (created_at DESC)",
                    "CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests (status)",
                    "CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests (created_at DESC)",
                ]

                for statement in indexes:
                    cursor.execute(statement)

            db.commit()
        except Exception:
            db.rollback()
            raise

    try:
        from backend.config.db_columns import validate_db_schema

        validate_db_schema()
    except Exception as exc:
        raise RuntimeError(f"Schema validation failed: {exc}") from exc

    print("Database initialized successfully")


def database_health_check() -> dict:
    """Return database, pgvector, schema, and workload health information."""

    required_tables = {
        "users",
        "reports",
        "report_requests",
        "contact_requests",
    }

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
            database_result = cursor.fetchone()

            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                """
            )
            existing_tables = {
                row["table_name"] for row in cursor.fetchall()
            }

            cursor.execute("SELECT COUNT(*) AS report_count FROM reports")
            report_count = cursor.fetchone()["report_count"]

            cursor.execute(
                """
                SELECT COUNT(*) AS pending_request_count
                FROM report_requests
                WHERE status IN ('Pending', 'Under Review', 'Sync Failed')
                """
            )
            pending_count = cursor.fetchone()["pending_request_count"]

    missing_tables = sorted(required_tables - existing_tables)
    healthy = bool(
        database_result
        and database_result["vector_enabled"]
        and not missing_tables
    )

    return {
        "status": "healthy" if healthy else "unhealthy",
        "database_name": (
            database_result["database_name"] if database_result else None
        ),
        "vector_enabled": (
            database_result["vector_enabled"] if database_result else False
        ),
        "missing_tables": missing_tables,
        "report_count": report_count,
        "pending_request_count": pending_count,
    }


if __name__ == "__main__":
    init_db()
    print(database_health_check())
