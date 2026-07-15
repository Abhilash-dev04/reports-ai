#!/usr/bin/env python3
"""Upload Excel and auto-index embeddings."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import requests
from backend.database.connection import get_db, init_db
from backend.embedding.model import encode_text
from backend.config import settings

def upload_excel(file_path: str, api_url: str = None):
    if api_url is None:
        api_url = settings.API_BASE_URL

    df = pd.read_excel(file_path)
    print(f"Read {len(df)} rows from {file_path}")

    init_db()
    db = get_db(admin=True)

    inserted = 0
    updated = 0
    updated_ids = []

    for _, row in df.iterrows():
        report_id = str(row.get('report_id'))
        search_text = f"{row.get('report_name', '')} {row.get('functional_area', '')} {row.get('package_name', '')}"
        embedding = encode_text(search_text)
        emb_str = f"[{','.join(str(x) for x in embedding)}]"

        # Check if report exists
        db.execute("SELECT id FROM reports WHERE report_id = %s", (report_id,))
        existing = db.fetchone()

        if existing:
            db.execute("""
                UPDATE reports SET
                    job_name = %s, report_name = %s, functional_area = %s, package_name = %s,
                    frequency = %s, report_type = %s, state = %s, data_source = %s, search_text = %s,
                    embedding = %s::vector, updated_at = CURRENT_TIMESTAMP
                WHERE report_id = %s
            """, (
                str(row.get('job_name', '')), str(row.get('report_name', '')),
                str(row.get('functional_area', '')), str(row.get('package_name', '')),
                str(row.get('frequency', '')), str(row.get('report_type', '')),
                str(row.get('state', 'AK')), str(row.get('data_source', 'MMIS')),
                search_text, emb_str, report_id
            ))
            updated += 1
            updated_ids.append(report_id)
        else:
            db.execute("""
                INSERT INTO reports (report_id, job_name, report_name, functional_area, package_name,
                    frequency, report_type, state, data_source, search_text, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
            """, (
                report_id, str(row.get('job_name', '')), str(row.get('report_name', '')),
                str(row.get('functional_area', '')), str(row.get('package_name', '')),
                str(row.get('frequency', '')), str(row.get('report_type', '')),
                str(row.get('state', 'AK')), str(row.get('data_source', 'MMIS')),
                search_text, emb_str
            ))
            inserted += 1

    db.connection.commit()
    db.close()

    # AUTO-INDEX: Generate embeddings for any reports without embeddings
    print("Auto-indexing new/updated reports...")
    try:
        from backend.ingestion.cron import run_indexing
        indexed = run_indexing()
        print(f"Auto-indexed {indexed} reports")
    except Exception as e:
        print(f"Auto-index warning: {e}")

    # Notify dashboard
    messages = []
    if inserted > 0:
        messages.append(f"Inserted {inserted} new records")

    if updated > 0:
        id_list = ', '.join(updated_ids[:5])
        if len(updated_ids) > 5:
            id_list += f'... ({len(updated_ids) - 5} more)'
        messages.append(f"Updated {updated} existing reports: {id_list}")

    if messages:
        try:
            requests.post(f"{api_url}/api/notify", json={
                "type": "upload",
                "count": inserted,
                "updated": updated,
                "file": file_path,
                "message": f"Data team upload from {file_path}: {'; '.join(messages)}"
            }, timeout=10)
            print(f"Dashboard notified: {'; '.join(messages)}")
        except Exception as e:
            print(f"Upload done but notification failed: {e}")
    else:
        print("No changes made.")

    print(f"Summary: {inserted} inserted, {updated} updated")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload Excel reports to database")
    parser.add_argument("--file", required=True, help="Path to Excel file")
    parser.add_argument("--api", default=None, help="API base URL")
    args = parser.parse_args()
    upload_excel(args.file, args.api)
