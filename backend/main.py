"""AI Report Metadata Explorer FastAPI backend."""

import os
import sys
import warnings
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row

load_dotenv()
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database.connection import get_db, init_db
from backend.search.service import search_reports as run_search
from backend.services.auth_service import require_reviewer
from backend.services.report_request_service import (
    approve_request,
    get_request as get_report_request,
    list_requests,
    reject_request,
    start_review,
)
from backend.services.email_service import (
    send_contact_notification,
    send_report_request_notification,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting AI Report Metadata Explorer...")
    init_db()
    yield
    print("Shutting down...")


app = FastAPI(
    title="Report Metadata API",
    description="AI-assisted report metadata discovery platform",
    version="3.0.0",
    lifespan=lifespan,
)

frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "3.0.0"}


@app.get("/api")
async def api_root():
    return {"message": "AI Report Metadata API", "docs": "/docs"}


def _dashboard_query(sql: str, state: str):
    where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
    params = (state,) if state != "all" else ()
    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(sql.format(where=where), params)
            return cursor.fetchall()


@app.get("/api/dashboard/kpis")
async def get_kpis(state: str = Query("all", max_length=50)):
    rows = _dashboard_query(
        """
        SELECT COUNT(*) AS total_reports,
               COUNT(DISTINCT functional_area) AS total_modules,
               COUNT(DISTINCT package_name) AS total_packages,
               COUNT(DISTINCT data_source) AS data_sources
        FROM reports {where}
        """,
        state,
    )
    return rows[0] if rows else {
        "total_reports": 0, "total_modules": 0,
        "total_packages": 0, "data_sources": 0,
    }


@app.get("/api/dashboard/modules")
async def get_modules(state: str = Query("all", max_length=50)):
    return _dashboard_query(
        """SELECT COALESCE(functional_area, 'Unknown') AS name, COUNT(*) AS value
           FROM reports {where} GROUP BY functional_area ORDER BY value DESC""",
        state,
    )


@app.get("/api/dashboard/frequency")
async def get_frequency(state: str = Query("all", max_length=50)):
    return _dashboard_query(
        """SELECT COALESCE(frequency, 'Unknown') AS name, COUNT(*) AS value
           FROM reports {where} GROUP BY frequency ORDER BY value DESC""",
        state,
    )


@app.get("/api/dashboard/packages")
async def get_packages(state: str = Query("all", max_length=50)):
    return _dashboard_query(
        """SELECT COALESCE(package_name, 'Unknown') AS name, COUNT(*) AS value
           FROM reports {where} GROUP BY package_name ORDER BY value DESC""",
        state,
    )


@app.get("/api/dashboard/datasource")
async def get_datasource(state: str = Query("all", max_length=50)):
    return _dashboard_query(
        """SELECT COALESCE(data_source, 'Unknown') AS name, COUNT(*) AS value
           FROM reports {where} GROUP BY data_source ORDER BY value DESC""",
        state,
    )


@app.get("/api/reports/recent")
async def get_recent_reports(
    state: str = Query("all", max_length=50),
    limit: int = Query(8, ge=1, le=50),
):
    where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
    params = [state] if state != "all" else []
    params.append(limit)
    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT report_id, report_name, functional_area,
                       package_name, state, data_source, updated_at
                FROM reports {where}
                ORDER BY updated_at DESC NULLS LAST
                LIMIT %s
                """,
                params,
            )
            return cursor.fetchall()


@app.get("/api/search")
async def search_endpoint(
    q: str = Query(..., min_length=1, max_length=500),
    mode: str = Query("traditional", pattern="^(traditional|nlp)$"),
    state: str = Query("all", max_length=50),
    limit: int = Query(20, ge=1, le=100),
    minimum_condition_match: float = Query(0.80, ge=0.0, le=1.0),
):
    try:
        return run_search(q.strip(), mode, state, limit, minimum_condition_match)
    except Exception as exc:
        print(f"Search error: {exc}")
        raise HTTPException(status_code=500, detail="Search is temporarily unavailable") from exc


@app.get("/api/reports/{report_id}")
async def get_report(report_id: str):
    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, report_id, job_name, predecessor, successor, state,
                       report_name, functional_area, package_name, script_name,
                       output_format, frequency, report_type, report_query,
                       tables_used, data_source, columns_in_tables, filters,
                       record_source, created_at, updated_at
                FROM reports WHERE report_id = %s
                """,
                (report_id,),
            )
            result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    return result


@app.post("/api/report-requests", status_code=201)
async def create_report_request(request: Request):
    data = await request.json()
    report_name = str(data.get("report_name") or "").strip()
    if not report_name:
        raise HTTPException(status_code=400, detail="Report name is required")

    fields = [
        "original_query", "report_id", "job_name", "predecessor", "successor",
        "state", "report_name", "functional_area", "package_name", "script_name",
        "output_format", "frequency", "report_type", "report_query", "tables_used",
        "data_source", "columns_in_tables", "filters", "requested_by", "requester_email",
    ]
    request_data = {
        field: str(data.get(field) or "").strip()
        for field in fields
    }

    with get_db() as db:
        with db.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                INSERT INTO report_requests ({', '.join(fields)})
                VALUES ({', '.join(['%s'] * len(fields))})
                RETURNING id, status, created_at
                """,
                [request_data[field] for field in fields],
            )
            created = cursor.fetchone()
        db.commit()

    email_result = send_report_request_notification(
        created["id"],
        request_data,
    )

    with get_db() as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                UPDATE report_requests
                SET email_sent = %s,
                    email_error = %s,
                    email_sent_at = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    email_result.sent,
                    email_result.error,
                    email_result.sent,
                    created["id"],
                ),
            )
        db.commit()

    return {
        "status": "success",
        "message": "Report details submitted for reporting team review",
        "request_id": created["id"],
        "request_status": created["status"],
        "email_sent": email_result.sent,
        "created_at": created["created_at"],
    }


@app.post("/api/contact", status_code=201)
async def contact_dev(request: Request):
    data = await request.json()
    message = str(data.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    request_data = {
        "original_query": str(data.get("original_query") or "").strip(),
        "message": message,
        "requested_by": str(data.get("requested_by") or "").strip(),
        "requester_email": str(data.get("requester_email") or "").strip(),
    }

    with get_db() as db:
        with db.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO contact_requests (
                    original_query, message, requested_by, requester_email
                ) VALUES (%s, %s, %s, %s)
                RETURNING id, status, created_at
                """,
                (
                    request_data["original_query"],
                    request_data["message"],
                    request_data["requested_by"],
                    request_data["requester_email"],
                ),
            )
            created = cursor.fetchone()
        db.commit()

    email_result = send_contact_notification(
        created["id"],
        request_data,
    )

    with get_db() as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                UPDATE contact_requests
                SET email_sent = %s,
                    email_error = %s,
                    email_sent_at = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    email_result.sent,
                    email_result.error,
                    email_result.sent,
                    created["id"],
                ),
            )
        db.commit()

    return {
        "status": "success",
        "message": "The Reporting Support Team request was recorded",
        "request_id": created["id"],
        "request_status": created["status"],
        "email_sent": email_result.sent,
        "created_at": created["created_at"],
    }


@app.get("/api/report-requests")
async def reviewer_list_requests(
    request_status: str = Query("all", alias="status", max_length=30),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    reviewer: dict = Depends(require_reviewer),
):
    del reviewer
    allowed = {"all", "Pending", "Under Review", "Approved", "Rejected", "Sync Failed"}
    if request_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid request status")
    return {"status": "success", "requests": list_requests(request_status, limit, offset)}


@app.get("/api/report-requests/{request_id}")
async def reviewer_get_request(
    request_id: int,
    reviewer: dict = Depends(require_reviewer),
):
    del reviewer
    try:
        return get_report_request(request_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/report-requests/{request_id}/start-review")
async def reviewer_start_review(
    request_id: int,
    reviewer: dict = Depends(require_reviewer),
):
    try:
        return {"status": "success", "request": start_review(request_id, reviewer["username"])}
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/report-requests/{request_id}/approve")
async def reviewer_approve(
    request_id: int,
    request: Request,
    reviewer: dict = Depends(require_reviewer),
):
    payload = await request.json()
    try:
        result = approve_request(request_id, reviewer["username"], str(payload.get("comments") or "").strip())
        return {"status": "success", "message": "Request approved and report is searchable", **result}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/report-requests/{request_id}/reject")
async def reviewer_reject(
    request_id: int,
    request: Request,
    reviewer: dict = Depends(require_reviewer),
):
    payload = await request.json()
    try:
        result = reject_request(request_id, reviewer["username"], str(payload.get("reason") or "").strip())
        return {"status": "success", "message": "Request rejected", "request": result}
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/auth/login")
async def login(request: Request):
    data = await request.json()
    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "")
    if not username or not password:
        raise HTTPException(status_code=401, detail="Username and password required")

    with get_db(row_factory=dict_row) as db:
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM users WHERE username = %s AND is_active = TRUE",
                (username,),
            )
            user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    if not pwd_context.verify(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    import jwt
    from datetime import datetime, timedelta, timezone
    jwt_secret = os.environ.get("JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(status_code=500, detail="JWT configuration is missing")
    token = jwt.encode(
        {
            "sub": username,
            "role": user.get("role", "user"),
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        },
        jwt_secret,
        algorithm="HS256",
    )
    return {
        "token": token,
        "username": username,
        "email": user.get("email"),
        "role": user.get("role", "user"),
    }


@app.post("/api/auth/signup", status_code=201)
async def signup(request: Request):
    data = await request.json()
    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "")
    email = str(data.get("email") or "").strip() or None
    if len(username) < 3 or len(password) < 6:
        raise HTTPException(status_code=400, detail="Username must be 3+ characters and password 6+ characters")

    from passlib.context import CryptContext
    password_hash = CryptContext(schemes=["bcrypt"], deprecated="auto").hash(password)

    try:
        with get_db() as db:
            with db.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    INSERT INTO users (username, password_hash, role, email)
                    VALUES (%s, %s, 'user', %s)
                    RETURNING user_id, username, role, email
                    """,
                    (username, password_hash, email),
                )
                user = cursor.fetchone()
            db.commit()
    except psycopg.errors.UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Username already exists") from exc

    return {"status": "success", "message": "Account created", "user": user}


build_dir = Path(__file__).parent.parent / "frontend" / "build"

if build_dir.exists():
    static_dir = build_dir / "static"
    images_dir = build_dir / "images"

    if static_dir.exists():
        app.mount(
            "/static",
            StaticFiles(directory=str(static_dir)),
            name="static",
        )

    if images_dir.exists():
        app.mount(
            "/images",
            StaticFiles(directory=str(images_dir)),
            name="images",
        )

    @app.get("/", response_class=HTMLResponse)
    async def serve_index():
        index_file = build_dir / "index.html"

        if not index_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Frontend index file not found",
            )

        return HTMLResponse(
            content=index_file.read_text(encoding="utf-8")
        )

    @app.get("/{path:path}")
    async def catch_all(path: str):
        if path.startswith("api/"):
            raise HTTPException(
                status_code=404,
                detail="API endpoint not found",
            )

        index_file = build_dir / "index.html"

        if not index_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Frontend index file not found",
            )

        return HTMLResponse(
            content=index_file.read_text(encoding="utf-8")
        )

else:
    @app.get("/")
    async def root():
        return {
            "message": "AI Report Metadata API",
            "docs": "/docs",
            "note": "Frontend build directory not found",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
