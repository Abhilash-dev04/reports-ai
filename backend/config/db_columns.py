"""Canonical field-to-database column mappings and safe SQL helpers."""
from typing import Dict, Iterable, List, Optional

REPORTS_COLUMN_MAP: Dict[str, str] = {
    "report_id": "ReportID", "job_name": "Job Name", "predecessor": "Predecessor",
    "successor": "Successor", "state": "State", "report_name": "Report Name",
    "functional_area": "Module", "package_name": "Package", "script_name": "Script",
    "output_format": "Output Format", "frequency": "Frequency",
    "report_type": "Report Type", "report_query": "Query", "tables_used": "Tables Used",
    "data_source": "Data Source", "columns_in_tables": "Columns Used",
}
REPORT_REQUESTS_COLUMN_MAP: Dict[str, str] = {key: key for key in REPORTS_COLUMN_MAP}

def _get_map(table: Optional[str]) -> Dict[str, str]:
    if not table or table == "reports": return REPORTS_COLUMN_MAP
    if table == "report_requests": return REPORT_REQUESTS_COLUMN_MAP
    raise KeyError(f"Unknown table mapping: {table}")

def db_column(canonical: str, table: Optional[str] = "reports") -> str:
    return _get_map(table)[canonical]

def _quote(name: str) -> str:
    return f'"{name}"' if any(c.isupper() for c in name) or " " in name or "-" in name else name

def quoted_db_column(canonical: str, table: Optional[str] = "reports") -> str:
    return _quote(db_column(canonical, table))

def select_alias_sql(fields: Iterable[str], table: Optional[str] = "reports") -> str:
    mapping = _get_map(table); parts: List[str] = []
    for field in fields:
        parts.append(f"{_quote(mapping[field])} AS {field}" if field in mapping else field)
    return ", ".join(parts)

def quoted_column_list(fields: Iterable[str], table: Optional[str] = "reports") -> str:
    mapping = _get_map(table)
    return ", ".join(_quote(mapping[field]) if field in mapping else field for field in fields)

def placeholders(n: int) -> str: return ", ".join(["%s"] * n)

def conflict_update_clause(fields: Iterable[str], table: Optional[str] = "reports") -> str:
    mapping = _get_map(table); parts = []
    for field in fields:
        if field in mapping:
            name = _quote(mapping[field]); parts.append(f"{name} = EXCLUDED.{name}")
        else:
            parts.append(f"{field} = EXCLUDED.{field}")
    return ",\n                        ".join(parts)

def validate_db_schema() -> None:
    from backend.database.connection import get_db
    missing = {}
    with get_db(admin=True) as db:
        with db.cursor() as cursor:
            for table, mapping in {"reports": REPORTS_COLUMN_MAP, "report_requests": REPORT_REQUESTS_COLUMN_MAP}.items():
                cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s AND table_schema = 'public'", (table,))
                existing = {row[0] for row in cursor.fetchall()}
                absent = sorted(set(mapping.values()) - existing)
                if absent: missing[table] = absent
    if missing:
        raise RuntimeError("Database schema validation failed: " + "; ".join(f"Missing columns in {t}: {', '.join(c)}" for t, c in missing.items()))
