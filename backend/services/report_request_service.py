"""report-request review, approval, and rejection operations."""

from typing import Dict, List, Optional

from psycopg.rows import dict_row

from backend.database.connection import get_db
from backend.embedding.model import encode_text
from backend.services.excel_sync_service import (
    ExcelSyncError,
    sync_report_to_excel,
)

REPORT_REQUEST_FIELDS = [
    "report_id",
    "job_name",
    "predecessor",
    "successor",
    "state",
    "report_name",
    "functional_area",
    "package_name",
    "script_name",
    "output_format",
    "frequency",
    "report_type",
    "report_query",
    "tables_used",
    "data_source",
    "columns_in_tables",
    "filters",
]


def _clean(value: object) -> str:
    return str(value or "").strip()


def build_search_text(data: Dict[str, object]) -> str:
    """Build canonical searchable text for an approved report."""

    return f"""
Report ID: {_clean(data.get('report_id'))}
Report Name: {_clean(data.get('report_name'))}
Job Name: {_clean(data.get('job_name'))}
Functional Area: {_clean(data.get('functional_area'))}
Package Name: {_clean(data.get('package_name'))}
Script Name: {_clean(data.get('script_name'))}
Output Format: {_clean(data.get('output_format'))}
Frequency: {_clean(data.get('frequency'))}
Report Type: {_clean(data.get('report_type'))}
State: {_clean(data.get('state'))}
Data Source: {_clean(data.get('data_source'))}
Predecessor: {_clean(data.get('predecessor'))}
Successor: {_clean(data.get('successor'))}
Tables Used: {_clean(data.get('tables_used'))}
Columns Used: {_clean(data.get('columns_in_tables'))}
Filters: {_clean(data.get('filters'))}
""".strip()


def _embedding_string(text: str) -> str:
    embedding = encode_text(text)
    if len(embedding) != 384:
        raise ValueError(
            f"Expected 384 embedding dimensions, received {len(embedding)}"
        )
    return "[" + ",".join(str(float(value)) for value in embedding) + "]"


def list_requests(
    request_status: Optional[str],
    limit: int,
    offset: int,
) -> List[dict]:
    """List report requests for the reviewer queue."""

    clauses = []
    params = []

    if request_status and request_status != "all":
        clauses.append("status = %s")
        params.append(request_status)

    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    params.extend([limit, offset])

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT id, original_query, report_id, report_name,
                       job_name, state, functional_area, package_name,
                       requested_by, requester_email, status,
                       reviewed_by, review_comments, reviewed_at,
                       database_synced, excel_synced, sync_error,
                       email_sent, created_at, updated_at
                FROM report_requests
                {where}
                ORDER BY
                    CASE status
                        WHEN 'Pending' THEN 1
                        WHEN 'Under Review' THEN 2
                        WHEN 'Sync Failed' THEN 3
                        WHEN 'Approved' THEN 4
                        WHEN 'Rejected' THEN 5
                        ELSE 6
                    END,
                    created_at DESC
                LIMIT %s OFFSET %s
                """,
                params,
            )
            return cursor.fetchall()


def get_request(request_id: int) -> dict:
    """Return a complete report request."""

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM report_requests WHERE id = %s",
                (request_id,),
            )
            request = cursor.fetchone()

    if not request:
        raise LookupError("Report request not found")

    return request


def start_review(request_id: int, reviewer: str) -> dict:
    """Mark a pending request as Under Review."""

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                UPDATE report_requests
                SET status = 'Under Review',
                    reviewed_by = %s,
                    reviewed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND status = 'Pending'
                RETURNING id, status, reviewed_by, reviewed_at
                """,
                (reviewer, request_id),
            )
            result = cursor.fetchone()
        db.commit()

    if not result:
        raise ValueError(
            "Only a Pending request can be moved to Under Review"
        )

    return result


def approve_request(
    request_id: int,
    reviewer: str,
    comments: str,
) -> dict:
    """Approve a request and upsert it into the official reports table."""

    with get_db(admin=True, row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM report_requests
                WHERE id = %s
                FOR UPDATE
                """,
                (request_id,),
            )
            request = cursor.fetchone()

            if not request:
                raise LookupError("Report request not found")

            if request["status"] not in {
                "Pending",
                "Under Review",
                "Sync Failed",
            }:
                raise ValueError(
                    f"Request cannot be approved from status {request['status']}"
                )

            report_data = {
                field: _clean(request.get(field))
                for field in REPORT_REQUEST_FIELDS
            }

            if not report_data["report_name"]:
                raise ValueError("Report name is required for approval")

            if not report_data["report_id"]:
                report_data["report_id"] = f"UI-RPT-{request_id:06d}"

            search_text = build_search_text(report_data)
            embedding = _embedding_string(search_text)

            cursor.execute(
                """
                INSERT INTO reports (
                    report_id, job_name, predecessor, successor, state,
                    report_name, functional_area, package_name, script_name,
                    output_format, frequency, report_type, report_query,
                    tables_used, data_source, columns_in_tables, filters,
                    search_text, embedding, record_source,
                    approved_by, approved_at, updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s::vector,
                    'UI_APPROVED', %s, CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (report_id)
                DO UPDATE SET
                    job_name = EXCLUDED.job_name,
                    predecessor = EXCLUDED.predecessor,
                    successor = EXCLUDED.successor,
                    state = EXCLUDED.state,
                    report_name = EXCLUDED.report_name,
                    functional_area = EXCLUDED.functional_area,
                    package_name = EXCLUDED.package_name,
                    script_name = EXCLUDED.script_name,
                    output_format = EXCLUDED.output_format,
                    frequency = EXCLUDED.frequency,
                    report_type = EXCLUDED.report_type,
                    report_query = EXCLUDED.report_query,
                    tables_used = EXCLUDED.tables_used,
                    data_source = EXCLUDED.data_source,
                    columns_in_tables = EXCLUDED.columns_in_tables,
                    filters = EXCLUDED.filters,
                    search_text = EXCLUDED.search_text,
                    embedding = EXCLUDED.embedding,
                    record_source = 'UI_APPROVED',
                    approved_by = EXCLUDED.approved_by,
                    approved_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING report_id, report_name, record_source,
                          approved_by, approved_at
                """,
                (
                    report_data["report_id"],
                    report_data["job_name"],
                    report_data["predecessor"],
                    report_data["successor"],
                    report_data["state"],
                    report_data["report_name"],
                    report_data["functional_area"],
                    report_data["package_name"],
                    report_data["script_name"],
                    report_data["output_format"],
                    report_data["frequency"],
                    report_data["report_type"],
                    report_data["report_query"],
                    report_data["tables_used"],
                    report_data["data_source"],
                    report_data["columns_in_tables"],
                    report_data["filters"],
                    search_text,
                    embedding,
                    reviewer,
                ),
            )
            report = cursor.fetchone()

            cursor.execute(
                """
                UPDATE report_requests
                SET report_id = %s,
                    status = 'Approved',
                    reviewed_by = %s,
                    review_comments = %s,
                    reviewed_at = CURRENT_TIMESTAMP,
                    database_synced = TRUE,
                    excel_synced = FALSE,
                    sync_error = NULL,
                    sync_attempted_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, status, database_synced,
                          excel_synced, reviewed_by, reviewed_at
                """,
                (
                    report_data["report_id"],
                    reviewer,
                    comments,
                    request_id,
                ),
            )
            updated_request = cursor.fetchone()

        db.commit()

    try:
        excel_result = sync_report_to_excel(report_data)
    except ExcelSyncError as error:
        with get_db() as db:
            with db.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    UPDATE report_requests
                    SET status = 'Sync Failed',
                        excel_synced = FALSE,
                        sync_error = %s,
                        sync_attempted_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, status, database_synced, excel_synced,
                              sync_error, reviewed_by, reviewed_at
                    """,
                    (str(error), request_id),
                )
                updated_request = cursor.fetchone()
            db.commit()

        return {
            "request": updated_request,
            "report": report,
            "excel_sync": {
                "success": False,
                "error": str(error),
            },
        }

    with get_db() as db:
        with db.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE report_requests
                SET status = 'Approved',
                    excel_synced = TRUE,
                    sync_error = NULL,
                    sync_attempted_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, status, database_synced, excel_synced,
                          sync_error, reviewed_by, reviewed_at
                """,
                (request_id,),
            )
            updated_request = cursor.fetchone()
        db.commit()

    return {
        "request": updated_request,
        "report": report,
        "excel_sync": excel_result,
    }


def retry_excel_sync(request_id: int, reviewer: str) -> dict:
    """Retry Excel synchronization for a database-synced request."""

    request = get_request(request_id)

    if not request.get("database_synced"):
        raise ValueError("The report must be synchronized to PostgreSQL first")

    if request.get("status") not in {"Approved", "Sync Failed"}:
        raise ValueError(
            "Excel synchronization can only be retried for Approved or Sync Failed requests"
        )

    report_data = {
        field: _clean(request.get(field))
        for field in REPORT_REQUEST_FIELDS
    }

    try:
        excel_result = sync_report_to_excel(report_data)
    except ExcelSyncError as error:
        with get_db() as db:
            with db.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    UPDATE report_requests
                    SET status = 'Sync Failed',
                        excel_synced = FALSE,
                        sync_error = %s,
                        sync_attempted_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, status, database_synced, excel_synced,
                              sync_error, sync_attempted_at
                    """,
                    (str(error), request_id),
                )
                updated_request = cursor.fetchone()
            db.commit()

        return {
            "request": updated_request,
            "excel_sync": {"success": False, "error": str(error)},
        }

    with get_db() as db:
        with db.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE report_requests
                SET status = 'Approved',
                    excel_synced = TRUE,
                    sync_error = NULL,
                    sync_attempted_at = CURRENT_TIMESTAMP,
                    reviewed_by = COALESCE(reviewed_by, %s),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, status, database_synced, excel_synced,
                          sync_error, sync_attempted_at
                """,
                (reviewer, request_id),
            )
            updated_request = cursor.fetchone()
        db.commit()

    return {
        "request": updated_request,
        "excel_sync": excel_result,
    }


def reject_request(
    request_id: int,
    reviewer: str,
    reason: str,
) -> dict:
    """Reject a request without changing the reports table."""

    if not reason.strip():
        raise ValueError("A rejection reason is required")

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                UPDATE report_requests
                SET status = 'Rejected',
                    reviewed_by = %s,
                    review_comments = %s,
                    reviewed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND status IN ('Pending', 'Under Review', 'Sync Failed')
                RETURNING id, status, reviewed_by,
                          review_comments, reviewed_at
                """,
                (reviewer, reason.strip(), request_id),
            )
            result = cursor.fetchone()
        db.commit()

    if not result:
        raise ValueError(
            "Only Pending, Under Review, or Sync Failed requests can be rejected"
        )

    return result
