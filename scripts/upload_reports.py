#!/usr/bin/env python3

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import requests

from backend.database.connection import get_db, init_db
from backend.embedding.model import encode_text
from backend.config import settings


def build_search_text(report):

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

Tables Used:
{report['tables_used']}

Columns Used:
{report['columns_in_tables']}
""".strip()


def upload_excel(file_path, api_url=None):

    if api_url is None:
        api_url = settings.api_base_url

    df = pd.read_excel(file_path)

    print(f"Read {len(df)} rows from {file_path}")

    init_db()

    db = get_db(admin=True)

    cursor = db.cursor()

    inserted = 0
    updated = 0

    for _, row in df.iterrows():

        report = {
            "report_id": str(row.get("Report ID", "")).strip(),
            "job_name": str(row.get("Job Name", "")).strip(),
            "report_name": str(row.get("Report Description", "")).strip(),
            "functional_area": str(row.get("Module", "")).strip(),
            "package_name": str(row.get("Package", "")).strip(),
            "script_name": str(row.get("Script Name", "")).strip(),
            "output_format": str(row.get("Output Format", "")).strip(),
            "frequency": str(row.get("Frequency", "")).strip(),
            "report_type": str(row.get("Report Type", "")).strip(),
            "state": str(row.get("State", "")).strip(),
            "data_source": str(row.get("Data Source", "")).strip(),
            "predecessor": str(row.get("Predecessor", "")).strip(),
            "successor": str(row.get("Successor", "")).strip(),
            "tables_used": str(row.get("Tables Used", "")).strip(),
            "columns_in_tables": str(row.get("Columns In Tables", "")).strip(),
            "report_query": str(row.get("QUERY", "")).strip()
        }

        search_text = build_search_text(report)

        embedding = encode_text(search_text)

        emb_str = f"[{','.join(str(x) for x in embedding)}]"

        cursor.execute(
            "SELECT id FROM reports WHERE report_id = %s",
            (report["report_id"],)
        )

        existing = cursor.fetchone()

        if existing:

            cursor.execute("""
                UPDATE reports SET
                    job_name=%s,
                    predecessor=%s,
                    successor=%s,
                    state=%s,
                    report_name=%s,
                    functional_area=%s,
                    package_name=%s,
                    script_name=%s,
                    output_format=%s,
                    frequency=%s,
                    report_type=%s,
                    report_query=%s,
                    tables_used=%s,
                    data_source=%s,
                    columns_in_tables=%s,
                    search_text=%s,
                    embedding=%s::vector,
                    updated_at=CURRENT_TIMESTAMP
                WHERE report_id=%s
            """, (
                report["job_name"],
                report["predecessor"],
                report["successor"],
                report["state"],
                report["report_name"],
                report["functional_area"],
                report["package_name"],
                report["script_name"],
                report["output_format"],
                report["frequency"],
                report["report_type"],
                report["report_query"],
                report["tables_used"],
                report["data_source"],
                report["columns_in_tables"],
                search_text,
                emb_str,
                report["report_id"]
            ))

            updated += 1

        else:

            cursor.execute("""
                INSERT INTO reports (
                    report_id,
                    job_name,
                    predecessor,
                    successor,
                    state,
                    report_name,
                    functional_area,
                    package_name,
                    script_name,
                    output_format,
                    frequency,
                    report_type,
                    report_query,
                    tables_used,
                    data_source,
                    columns_in_tables,
                    search_text,
                    embedding
                )
                VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector
                )
            """, (
                report["report_id"],
                report["job_name"],
                report["predecessor"],
                report["successor"],
                report["state"],
                report["report_name"],
                report["functional_area"],
                report["package_name"],
                report["script_name"],
                report["output_format"],
                report["frequency"],
                report["report_type"],
                report["report_query"],
                report["tables_used"],
                report["data_source"],
                report["columns_in_tables"],
                search_text,
                emb_str
            ))

            inserted += 1

    db.commit()

    cursor.close()
    db.close()

    print(f"Inserted={inserted} Updated={updated}")


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument("--file", required=True)

    args = parser.parse_args()

    upload_excel(args.file)
