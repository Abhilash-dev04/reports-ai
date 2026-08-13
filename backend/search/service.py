"""Hybrid report search for traditional and natural-language queries."""

import re
from collections import defaultdict
from typing import Dict, Iterable, List, Tuple

from psycopg.rows import dict_row

from backend.database.connection import get_db
from backend.embedding.model import encode_text

REPORT_FIELDS = [
    "id", "report_id", "job_name", "predecessor", "successor", "state",
    "report_name", "functional_area", "package_name", "script_name",
    "output_format", "frequency", "report_type", "tables_used",
    "data_source", "columns_in_tables", "filters", "created_at", "updated_at",
]

CONDITION_FIELDS = [
    "report_id", "job_name", "predecessor", "successor", "state",
    "report_name", "functional_area", "package_name", "script_name",
    "output_format", "frequency", "report_type", "tables_used",
    "data_source", "columns_in_tables",
]


def _normalize(value: object) -> str:
    return re.sub(r"[^a-z0-9_]+", " ", str(value or "").casefold()).strip()


def _tokens(value: object) -> set:
    return {token for token in _normalize(value).split() if len(token) > 1}


def _split_metadata(value: object) -> List[str]:
    return [part.strip() for part in re.split(r"[,;|\n]+", str(value or "")) if part.strip()]


def _vector_string(vector: Iterable[float]) -> str:
    values = list(vector)
    if len(values) != 384:
        raise ValueError(f"Expected a 384-dimensional embedding, received {len(values)}")
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def _metadata_catalog(rows: List[dict]) -> Dict[str, List[str]]:
    catalog = defaultdict(set)
    for row in rows:
        for field in CONDITION_FIELDS:
            value = row.get(field)
            if value is None:
                continue
            if field in {"tables_used", "columns_in_tables"}:
                values = _split_metadata(value)
            else:
                values = [str(value).strip()]
            for item in values:
                if item:
                    catalog[field].add(item)
    return {field: sorted(values, key=len, reverse=True) for field, values in catalog.items()}


def _extract_conditions(query: str, rows: List[dict]) -> Dict[str, List[str]]:
    query_normalized = _normalize(query)
    query_tokens = _tokens(query)
    catalog = _metadata_catalog(rows)
    conditions = defaultdict(list)

    for field, values in catalog.items():
        for value in values:
            normalized_value = _normalize(value)
            value_tokens = _tokens(value)
            if not normalized_value:
                continue
            exact_phrase = normalized_value in query_normalized
            exact_token = len(value_tokens) == 1 and value_tokens.issubset(query_tokens)
            identifier_match = (
                "_" in str(value)
                and normalized_value.replace(" ", "_") in query.casefold()
            )
            if exact_phrase or exact_token or identifier_match:
                if value not in conditions[field]:
                    conditions[field].append(value)

    # Capture explicit field/value phrases even when the requested value
    # does not exist in the current database catalog. This prevents an
    # unknown value such as "package name abhilash" from falling back to
    # semantic-only matching and returning an unrelated report.
    explicit_patterns = {
        "report_id": r"\breport\s+id\s*(?:is|=|:)?\s*([a-z0-9_-]+)",
        "job_name": r"\bjob\s+name\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "package_name": r"\bpackage(?:\s+name)?\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "script_name": r"\bscript(?:\s+name)?\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "output_format": r"\boutput\s+format\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "frequency": r"\bfrequency\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "state": r"\bstate\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "data_source": r"\bdata\s+source\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "predecessor": r"\bpredecessor\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "successor": r"\bsuccessor\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "tables_used": r"\b(?:table|tables|table\s+name)\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "columns_in_tables": r"\b(?:column|columns|column\s+name)\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "functional_area": r"\b(?:functional\s+area|module)\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
        "report_type": r"\breport\s+type\s*(?:is|=|:)?\s*([a-z0-9_.-]+)",
    }

    query_casefolded = query.casefold()

    for field, pattern in explicit_patterns.items():
        for match in re.finditer(pattern, query_casefolded):
            value = match.group(1).strip(" .,:;!?\t\r\n")
            if value and value not in conditions[field]:
                conditions[field].append(value)

    aliases = {
        "csv": ("output_format", "CSV"),
        "pdf": ("output_format", "PDF"),
        "excel": ("output_format", "Excel"),
        "xlsx": ("output_format", "Excel"),
        "daily": ("frequency", "Daily"),
        "weekly": ("frequency", "Weekly"),
        "monthly": ("frequency", "Monthly"),
        "quarterly": ("frequency", "Quarterly"),
        "yearly": ("frequency", "Yearly"),
        "annually": ("frequency", "Yearly"),
    }
    for token, (field, value) in aliases.items():
        if token in query_tokens and value not in conditions[field]:
            conditions[field].append(value)

    return dict(conditions)


def _value_matches(field: str, actual: object, expected: str) -> bool:
    actual_normalized = _normalize(actual)
    expected_normalized = _normalize(expected)
    if not expected_normalized:
        return False
    if field in {"tables_used", "columns_in_tables"}:
        return any(
            _normalize(item) == expected_normalized
            for item in _split_metadata(actual)
        )
    return expected_normalized == actual_normalized or expected_normalized in actual_normalized


def _condition_coverage(row: dict, conditions: Dict[str, List[str]]) -> Tuple[float, List[dict]]:
    total = 0
    matched = 0
    details = []
    for field, expected_values in conditions.items():
        for expected in expected_values:
            total += 1
            is_match = _value_matches(field, row.get(field), expected)
            if is_match:
                matched += 1
            details.append({"field": field, "expected": expected, "matched": is_match})
    coverage = 0.0 if total == 0 else matched / total
    return coverage, details


def _serialize_result(row: dict, condition_coverage: float, match_details: List[dict]) -> dict:
    result = {field: row.get(field) for field in REPORT_FIELDS}
    semantic_similarity = max(0.0, min(1.0, float(row.get("semantic_similarity") or 0.0)))
    final_score = (condition_coverage * 0.70) + (semantic_similarity * 0.30)
    result.update({
        "condition_match_percent": round(condition_coverage * 100, 2),
        "semantic_score_percent": round(semantic_similarity * 100, 2),
        "final_score_percent": round(final_score * 100, 2),
        "matched_conditions": match_details,
    })
    return result


def traditional_search(query: str, state: str, limit: int) -> dict:
    pattern = f"%{query.strip()}%"
    where = "" if state == "all" else " AND state = %s"
    params = [pattern] * 6
    if state != "all":
        params.append(state)
    params.append(limit)

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT {', '.join(REPORT_FIELDS)}
                FROM reports
                WHERE (
                    report_id ILIKE %s OR report_name ILIKE %s OR
                    job_name ILIKE %s OR script_name ILIKE %s OR
                    package_name ILIKE %s OR functional_area ILIKE %s
                )
                {where}
                ORDER BY updated_at DESC NULLS LAST
                LIMIT %s
                """,
                params,
            )
            rows = cursor.fetchall()

    results = []
    for row in rows:
        item = dict(row)
        item.update({
            "condition_match_percent": 100.0,
            "semantic_score_percent": None,
            "final_score_percent": 100.0,
            "matched_conditions": [],
        })
        results.append(item)

    return _response(query, "traditional", {}, results)


def natural_language_search(
    query: str,
    state: str,
    limit: int,
    minimum_condition_match: float,
) -> dict:
    query_vector = _vector_string(encode_text(query))
    state_sql = "" if state == "all" else "WHERE state = %s"
    params = [] if state == "all" else [state]

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT {', '.join(REPORT_FIELDS)},
                       1 - (embedding <=> %s::vector) AS semantic_similarity
                FROM reports
                {state_sql}
                {'AND' if state != 'all' else 'WHERE'} embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT 250
                """,
                [query_vector] + params + [query_vector],
            )
            rows = [dict(row) for row in cursor.fetchall()]

    conditions = _extract_conditions(query, rows)
    eligible = []
    minimum_semantic_similarity = 0.50

    for row in rows:
        coverage, details = _condition_coverage(row, conditions)
        semantic_similarity = max(
            0.0,
            min(1.0, float(row.get("semantic_similarity") or 0.0)),
        )

        if conditions:
            is_eligible = coverage >= minimum_condition_match
            effective_coverage = coverage
        else:
            is_eligible = semantic_similarity >= minimum_semantic_similarity
            effective_coverage = semantic_similarity

        if is_eligible:
            eligible.append(
                _serialize_result(row, effective_coverage, details)
            )

    eligible.sort(
        key=lambda item: item["final_score_percent"],
        reverse=True,
    )

    return _response(
        query,
        "nlp",
        conditions,
        eligible[:limit],
        minimum_condition_match,
    )


def _response(
    query: str,
    mode: str,
    conditions: dict,
    results: list,
    minimum_condition_match: float = 0.80,
) -> dict:
    if results:
        return {
            "status": "matches_found",
            "mode": mode,
            "query": query,
            "identified_conditions": conditions,
            "minimum_condition_match": minimum_condition_match,
            "results": results,
            "actions": {"add_details": False, "contact_support_team": False},
        }
    return {
        "status": "no_match",
        "mode": mode,
        "query": query,
        "identified_conditions": conditions,
        "minimum_condition_match": minimum_condition_match,
        "message": "No details found",
        "results": [],
        "actions": {"add_details": True, "contact_support_team": True},
    }


def search_reports(query: str, mode: str, state: str, limit: int, minimum_condition_match: float) -> dict:
    if mode == "traditional":
        return traditional_search(query, state, limit)
    return natural_language_search(query, state, limit, minimum_condition_match)
