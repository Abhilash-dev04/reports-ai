"""
Infinite Report Intelligence Platform - FastAPI Backend
Serves both API and React frontend static files
"""
import os
import sys
import warnings
from pathlib import Path

# Suppress bcrypt version warning
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from backend.embedding.model import encode_text
from backend.database.connection import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up Infinite Report Intelligence Platform...")
    try:
        init_db()
        print("Database initialized")
    except Exception as e:
        print(f"Database init warning: {e}")
    yield
    print("Shutting down...")

app = FastAPI(
    title="Infinite API",
    description="AI-Powered Medicaid Report Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

@app.get("/api")
async def api_root():
    return {"message": "Infinite Report Intelligence API", "docs": "/docs"}

@app.get("/api/dashboard/kpis")
async def get_kpis(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        where_clause = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"""
            SELECT COUNT(*) as total_reports, COUNT(DISTINCT functional_area) as total_modules,
                   COUNT(DISTINCT package_name) as total_packages, COUNT(DISTINCT data_source) as data_sources
            FROM reports {where_clause}
        """, params)
        result = cursor.fetchone()
        cursor.close(); db.close()
        return result or {"total_reports": 0, "total_modules": 0, "total_packages": 0, "data_sources": 0}
    except Exception as e:
        print(f"KPI error: {e}")
        return {"total_reports": 48, "total_modules": 1, "total_packages": 6, "data_sources": 1}

@app.get("/api/dashboard/modules")
async def get_modules(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT functional_area as name, COUNT(*) as value FROM reports {where} GROUP BY functional_area", params)
        result = cursor.fetchall()
        cursor.close(); db.close()
        return result or [{"name": "PROVIDER", "value": 48}]
    except Exception as e:
        return [{"name": "PROVIDER", "value": 48}]

@app.get("/api/dashboard/frequency")
async def get_frequency(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT COALESCE(frequency, 'Unknown') as name, COUNT(*) as value FROM reports {where} GROUP BY frequency", params)
        result = cursor.fetchall()
        cursor.close(); db.close()
        return result or [{"name": "Unknown", "value": 48}]
    except Exception as e:
        return [{"name": "Unknown", "value": 48}]

@app.get("/api/dashboard/packages")
async def get_packages(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT package_name as name, COUNT(*) as value FROM reports {where} GROUP BY package_name", params)
        result = cursor.fetchall()
        cursor.close(); db.close()
        return result or []
    except Exception as e:
        return []

@app.get("/api/dashboard/datasource")
async def get_datasource(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT data_source as name, COUNT(*) as value FROM reports {where} GROUP BY data_source", params)
        result = cursor.fetchall()
        cursor.close(); db.close()
        return result or [{"name": "MMIS", "value": 48}]
    except Exception as e:
        return [{"name": "MMIS", "value": 48}]

@app.get("/api/search")
async def search_reports(
    q: str = Query(""),
    state: str = Query("all"),
    limit: int = Query(20),
    threshold: float = Query(0.80)
):
    try:

        from backend.database.connection import get_db
        import psycopg

        if not q.strip():
            return []

        query_embedding = encode_text(q)

        emb_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        db = get_db()

        cursor = db.cursor(
            row_factory=psycopg.rows.dict_row
        )

        sql = """
        SELECT *,
               1 - (embedding <=> %s::vector) AS similarity
        FROM reports
        WHERE embedding IS NOT NULL
        """

        params = [emb_str]

        if state != "all":
            sql += " AND state = %s"
            params.append(state)

        sql += """
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """

        params.append(emb_str)
        params.append(limit * 5)

        cursor.execute(sql, params)

        rows = cursor.fetchall()

        cursor.close()
        db.close()

        results = []

        for row in rows:

            similarity = max(
                0.0,
                min(
                    1.0,
                    float(row["similarity"])
                )
            )

            if similarity >= threshold:

                row["score"] = round(
                    similarity * 100,
                    2
                )

                results.append(row)

        return results[:limit]

    except Exception as e:
        print(f"Search error: {e}")
        return []

@app.post("/api/reports")
async def add_report(request: Request):
    try:
        data = await request.json()
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor()
        report_id = data.get("report_id") or f"RPT-{os.urandom(4).hex().upper()}"
        cursor.execute("""
            INSERT INTO reports (report_id, report_name, functional_area, package_name, frequency, report_type, state, data_source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (report_id) DO UPDATE SET
                report_name = EXCLUDED.report_name, functional_area = EXCLUDED.functional_area,
                package_name = EXCLUDED.package_name, frequency = EXCLUDED.frequency,
                report_type = EXCLUDED.report_type, state = EXCLUDED.state,
                data_source = EXCLUDED.data_source, updated_at = NOW()
            RETURNING *
        """, (report_id, data.get("report_name"), data.get("functional_area"),
              data.get("package_name"), data.get("frequency", "Daily"),
              data.get("report_type", "Standard"), data.get("state", "NH"), data.get("data_source", "MMIS")))
        new_report = cursor.fetchone()
        db.commit()
        cursor.close(); db.close()
        return {"status": "success", "message": "Report added", "report": new_report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contact")
async def contact_dev(request: Request):
    try:
        data = await request.json()
        print(f"Dev team message: {data.get('message', '')}")
        return {"status": "success", "message": "Message sent to dev team"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(request: Request):
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        if not username or not password:
            raise HTTPException(status_code=401, detail="Username and password required")
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        cursor.close(); db.close()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        if not pwd_context.verify(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        import jwt
        from datetime import datetime, timedelta
        jwt_secret = os.environ.get("JWT_SECRET", "infinite-report-intelligence-secret-key-2026")
        token = jwt.encode({"sub": username, "role": user.get("role", "user"),
                           "exp": datetime.utcnow() + timedelta(days=1)}, jwt_secret, algorithm="HS256")
        return {"token": token, "username": username, "role": user.get("role", "user")}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/auth/signup")
async def signup(request: Request):
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        role = "user"
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        if len(username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        cursor.execute("SELECT user_id FROM users WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        if existing_user:
            cursor.close(); db.close()
            raise HTTPException(status_code=409, detail="Username already exists")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash(password)
        cursor.execute("INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s) RETURNING user_id, username, role",
                       (username, password_hash, role))
        new_user = cursor.fetchone()
        db.commit()
        cursor.close(); db.close()
        return {"status": "success", "message": "Account created successfully",
                "user": {"user_id": new_user["user_id"], "username": new_user["username"], "role": new_user["role"]}}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/auth/reset-password")
async def reset_password(request: Request):
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        new_password = data.get("new_password", "").strip()
        if not username or not new_password:
            raise HTTPException(status_code=400, detail="Username and new password required")
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        cursor.execute("SELECT user_id FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        if not user:
            cursor.close(); db.close()
            raise HTTPException(status_code=404, detail="User not found")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash(new_password)
        cursor.execute("UPDATE users SET password_hash = %s WHERE username = %s", (password_hash, username))
        db.commit()
        cursor.close(); db.close()
        return {"status": "success", "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

build_dir = Path(__file__).parent.parent / "frontend" / "build"
if build_dir.exists():
    @app.get("/", response_class=HTMLResponse)
    async def serve_index():
        index_file = build_dir / "index.html"
        if index_file.exists():
            with open(index_file, "r") as f:
                return f.read()
        return {"message": "Infinite Report Intelligence API", "docs": "/docs"}
    app.mount("/static", StaticFiles(directory=str(build_dir / "static")), name="static")
    @app.get("/{path:path}")
    async def catch_all(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        index_file = build_dir / "index.html"
        if index_file.exists():
            with open(index_file, "r") as f:
                return HTMLResponse(content=f.read())
        return {"message": "Infinite Report Intelligence API", "docs": "/docs"}
else:
    @app.get("/")
    async def root():
        return {"message": "Infinite Report Intelligence API", "docs": "/docs", "note": "Frontend not built"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
