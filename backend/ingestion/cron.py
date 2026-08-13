"""Optional idempotent re-indexing utility for report metadata."""
from backend.config.db_columns import select_alias_sql
from backend.database.connection import get_db
from backend.embedding.model import encode_text

FIELDS = ["id", "report_id", "job_name", "predecessor", "successor", "state", "report_name", "functional_area", "package_name", "script_name", "output_format", "frequency", "report_type", "tables_used", "data_source", "columns_in_tables"]
def build_search_text(row):
    labels = [("Report ID","report_id"),("Report Name","report_name"),("Job Name","job_name"),("Functional Area","functional_area"),("Package Name","package_name"),("Script Name","script_name"),("Output Format","output_format"),("Frequency","frequency"),("Report Type","report_type"),("State","state"),("Data Source","data_source"),("Predecessor","predecessor"),("Successor","successor"),("Tables Used","tables_used"),("Columns Used","columns_in_tables")]
    return "\n".join(f"{label}: {row.get(key, '') or ''}" for label, key in labels)
def run_indexing():
    with get_db(admin=True) as db:
        with db.cursor() as cursor:
            cursor.execute(f"SELECT {select_alias_sql(FIELDS)} FROM reports")
            columns = [item[0] for item in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            for row in rows:
                text = build_search_text(row); vector = encode_text(text)
                cursor.execute("UPDATE reports SET search_text=%s, embedding=%s::vector, updated_at=CURRENT_TIMESTAMP WHERE id=%s", (text, "[" + ",".join(map(str, vector)) + "]", row["id"]))
        db.commit()
    print(f"Indexed {len(rows)} reports")
    return len(rows)
if __name__ == "__main__": run_indexing()
