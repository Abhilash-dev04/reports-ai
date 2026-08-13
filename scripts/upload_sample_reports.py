#!/usr/bin/env python3
"""Upload synthetic report metadata from Excel and generate local embeddings."""

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from backend.config.db_columns import (
    conflict_update_clause,
    quoted_column_list,
    quoted_db_column,
)
from backend.database.connection import get_db, init_db
from backend.embedding.model import encode_text


EXPECTED_COLUMNS = [
    "Report ID",
    "Job Name",
    "Report Description",
    "Module",
    "Package",
    "Script Name",
    "Output Format",
    "Frequency",
    "Report Type",
    "State",
    "Data Source",
    "Predecessor",
    "Successor",
    "Tables Used",
    "Columns In Tables",
    "QUERY",
]

METADATA_FIELDS = [
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
]

# The business identity of a report is Report ID + Report Name + State.
CONFLICT_FIELDS = ["report_id", "report_name", "state"]

# Never update the three identity columns in the ON CONFLICT update clause.
UPDATE_METADATA_FIELDS = [
    field for field in METADATA_FIELDS if field not in CONFLICT_FIELDS
]

EMBEDDING_DIMENSION = 384


def clean_value(value) -> str:
    """Convert an Excel value to a trimmed string without storing NaN."""

    if pd.isna(value):
        return ""
    return str(value).strip()


def normalized_report_key(report: dict) -> tuple[str, str, str]:
    """Return the case-insensitive composite identity for one report."""

    return (
        report["report_id"].strip().casefold(),
        report["report_name"].strip().casefold(),
        report["state"].strip().casefold(),
    )


def validate_excel_columns(dataframe: pd.DataFrame) -> None:
    """Ensure that the workbook contains the agreed report headers."""

    actual_columns = set(dataframe.columns)
    missing_columns = [
        column for column in EXPECTED_COLUMNS if column not in actual_columns
    ]

    if missing_columns:
        raise ValueError(
            "Excel file is missing required columns: "
            + ", ".join(missing_columns)
        )


def build_report(row: pd.Series) -> dict:
    """Map one Excel row to canonical report metadata fields."""

    return {
        "report_id": clean_value(row.get("Report ID")),
        "job_name": clean_value(row.get("Job Name")),
        "predecessor": clean_value(row.get("Predecessor")),
        "successor": clean_value(row.get("Successor")),
        "state": clean_value(row.get("State")),
        "report_name": clean_value(row.get("Report Description")),
        "functional_area": clean_value(row.get("Module")),
        "package_name": clean_value(row.get("Package")),
        "script_name": clean_value(row.get("Script Name")),
        "output_format": clean_value(row.get("Output Format")),
        "frequency": clean_value(row.get("Frequency")),
        "report_type": clean_value(row.get("Report Type")),
        "report_query": clean_value(row.get("QUERY")),
        "tables_used": clean_value(row.get("Tables Used")),
        "data_source": clean_value(row.get("Data Source")),
        "columns_in_tables": clean_value(row.get("Columns In Tables")),
    }


def validate_report(report: dict, excel_row_number: int) -> None:
    """Validate fields required by the report identity and display."""

    if not report["report_id"]:
        raise ValueError(
            f"Excel row {excel_row_number}: Report ID is required"
        )

    if not report["report_name"]:
        raise ValueError(
            f"Excel row {excel_row_number}: Report Description is required"
        )

    if not report["state"]:
        raise ValueError(
            f"Excel row {excel_row_number}: State is required"
        )


def build_search_text(report: dict) -> str:
    """Build report text for embeddings, deliberately excluding raw QUERY."""

    return f"""
Report ID: {report['report_id']}
Report Name: {report['report_name']}
Job Name: {report['job_name']}
Functional Area: {report['functional_area']}
Package Name: {report['package_name']}
Script Name: {report['script_name']}
Output Format: {report['output_format']}
Frequency: {report['frequency']}
Report Type: {report['report_type']}
State: {report['state']}
Data Source: {report['data_source']}
Predecessor: {report['predecessor']}
Successor: {report['successor']}
Tables Used: {report['tables_used']}
Columns Used: {report['columns_in_tables']}
""".strip()


def embedding_to_pgvector(embedding: list) -> str:
    """Validate and serialize an embedding for PostgreSQL pgvector."""

    if len(embedding) != EMBEDDING_DIMENSION:
        raise ValueError(
            "Embedding model returned "
            f"{len(embedding)} dimensions; expected {EMBEDDING_DIMENSION}"
        )

    return "[" + ",".join(str(float(value)) for value in embedding) + "]"


def load_excel(file_path: str) -> pd.DataFrame:
    """Load and validate the Excel workbook."""

    workbook_path = Path(file_path).expanduser().resolve()

    if not workbook_path.is_file():
        raise FileNotFoundError(f"Excel file not found: {workbook_path}")

    dataframe = pd.read_excel(
        workbook_path,
        engine="openpyxl",
        dtype=object,
    )

    dataframe.columns = [str(column).strip() for column in dataframe.columns]
    validate_excel_columns(dataframe)

    duplicate_columns = dataframe.columns[
        dataframe.columns.duplicated()
    ].tolist()

    if duplicate_columns:
        raise ValueError(
            "Excel file contains duplicate columns: "
            + ", ".join(duplicate_columns)
        )

    return dataframe


def upload_excel(file_path: str) -> dict:
    """Insert or update all reports from an Excel workbook atomically."""

    dataframe = load_excel(file_path)
    print(f"Read {len(dataframe)} rows from {file_path}")

    init_db()

    prepared_reports = []
    seen_report_keys = set()
    skipped_blank_rows = 0

    for dataframe_index, row in dataframe.iterrows():
        excel_row_number = dataframe_index + 2
        report = build_report(row)

        if not any(report.values()):
            skipped_blank_rows += 1
            continue

        validate_report(report, excel_row_number)
        report_key = normalized_report_key(report)

        if report_key in seen_report_keys:
            raise ValueError(
                f"Excel row {excel_row_number}: duplicate report combination "
                f"Report ID '{report['report_id']}', "
                f"Report Description '{report['report_name']}', "
                f"State '{report['state']}'"
            )

        seen_report_keys.add(report_key)

        search_text = build_search_text(report)
        embedding = encode_text(search_text)
        embedding_string = embedding_to_pgvector(embedding)
        prepared_reports.append((report, search_text, embedding_string))

    inserted = 0
    updated = 0

    # Metadata columns use the reports-table mapping. Administrative columns
    # remain literal because they are not part of REPORTS_COLUMN_MAP.
    metadata_columns_sql = quoted_column_list(
        METADATA_FIELDS,
        table="reports",
    )
    insert_columns_sql = (
        f"{metadata_columns_sql}, search_text, embedding, record_source"
    )
    insert_parameter_count = len(METADATA_FIELDS) + 3
    placeholders_sql = ", ".join(["%s"] * insert_parameter_count)

    metadata_update_sql = conflict_update_clause(
        UPDATE_METADATA_FIELDS,
        table="reports",
    )

    conflict_target_sql = ", ".join(
        quoted_db_column(field, table="reports")
        for field in CONFLICT_FIELDS
    )

    with get_db(admin=True) as db:
        try:
            with db.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT
                        {quoted_db_column('report_id', table='reports')},
                        {quoted_db_column('report_name', table='reports')},
                        {quoted_db_column('state', table='reports')}
                    FROM reports
                    """
                )

                existing_report_keys = {
                    (
                        str(row[0] or "").strip().casefold(),
                        str(row[1] or "").strip().casefold(),
                        str(row[2] or "").strip().casefold(),
                    )
                    for row in cursor.fetchall()
                }

                for report, search_text, embedding_string in prepared_reports:
                    report_key = normalized_report_key(report)
                    was_existing = report_key in existing_report_keys

                    values = tuple(report[field] for field in METADATA_FIELDS) + (
                        search_text,
                        embedding_string,
                        "Excel",
                    )

                    if len(values) != insert_parameter_count:
                        raise RuntimeError(
                            "Upload field/value mismatch: "
                            f"{insert_parameter_count} placeholders and "
                            f"{len(values)} values"
                        )

                    cursor.execute(
                        f"""
                        INSERT INTO reports ({insert_columns_sql})
                        VALUES ({placeholders_sql})
                        ON CONFLICT ({conflict_target_sql})
                        DO UPDATE SET
                            {metadata_update_sql},
                            search_text = EXCLUDED.search_text,
                            embedding = EXCLUDED.embedding,
                            record_source = 'Excel',
                            approved_by = NULL,
                            approved_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        """,
                        values,
                    )

                    if was_existing:
                        updated += 1
                    else:
                        inserted += 1
                        existing_report_keys.add(report_key)

            db.commit()
        except Exception:
            db.rollback()
            raise

    result = {
        "inserted": inserted,
        "updated": updated,
        "skipped_blank_rows": skipped_blank_rows,
        "processed": inserted + updated,
    }

    print(
        "Upload completed: "
        f"{inserted} inserted, "
        f"{updated} updated, "
        f"{skipped_blank_rows} blank rows skipped"
    )

    return result


def main() -> None:
    """Command-line entry point."""

    parser = argparse.ArgumentParser(
        description="Upload report metadata from Excel into PostgreSQL"
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the Excel workbook",
    )
    arguments = parser.parse_args()
    upload_excel(arguments.file)


if __name__ == "__main__":
    main()
