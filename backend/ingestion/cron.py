"""
Indexing utilities - called during upload, not scheduled.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.connection import get_db
from backend.embedding.model import encode_text


def build_search_text(row):

    return f"""
Report ID: {row.get('report_id', '')}
Report Name: {row.get('report_name', '')}
Job Name: {row.get('job_name', '')}
Functional Area: {row.get('functional_area', '')}
Package Name: {row.get('package_name', '')}
Script Name: {row.get('script_name', '')}
Output Format: {row.get('output_format', '')}
Frequency: {row.get('frequency', '')}
Report Type: {row.get('report_type', '')}
State: {row.get('state', '')}
Data Source: {row.get('data_source', '')}
Predecessor: {row.get('predecessor', '')}
Successor: {row.get('successor', '')}

Tables Used:
{row.get('tables_used', '')}

Columns Used:
{row.get('columns_in_tables', '')}
""".strip()


def run_indexing():

    db = get_db(admin=True)

    cursor = db.cursor()

    cursor.execute("""
        SELECT *
        FROM reports
    """)

    columns = [desc[0] for desc in cursor.description]

    rows = [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

    indexed = 0

    for row in rows:

        search_text = build_search_text(row)

        embedding = encode_text(search_text)

        emb_str = f"[{','.join(str(x) for x in embedding)}]"

        cursor.execute(
            """
            UPDATE reports
            SET
                search_text = %s,
                embedding = %s::vector,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (
                search_text,
                emb_str,
                row["id"]
            )
        )

        indexed += 1

    db.commit()

    cursor.close()
    db.close()

    print(f"Indexed {indexed} reports")

    return indexed


if __name__ == "__main__":
    run_indexing()
