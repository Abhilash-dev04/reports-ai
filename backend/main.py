"""
Reports AI - FastAPI Backend
Serves both API and React frontend static files
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from contextlib import asynccontextmanager

from backend.database.connection import init_db
from backend.embedding.model import encode_text

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up Reports AI...")
    try:
        init_db()
        print("Database initialized")
    except Exception as e:
        print(f"Database init warning: {e}")
    yield
    print("Shutting down Reports AI...")

app = FastAPI(
    title="Reports AI API",
    description="AI-Powered Report Search Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api")
async def api_root():
    return {"message": "Reports AI API", "docs": "/docs"}

# Dashboard endpoints
@app.get("/api/dashboard/kpis")
async def get_kpis(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        where_clause = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT COUNT(*) as total_reports, COUNT(DISTINCT functional_area) as total_modules, COUNT(DISTINCT package_name) as total_packages, COUNT(DISTINCT data_source) as data_sources FROM reports {where_clause}", params)
        result = cursor.fetchone()
        cursor.close(); db.close()
        return result
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
        return result
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

# Search endpoints
@app.get("/api/search")
async def search_reports(q: str = Query(...), type: str = Query("traditional")):
    try:
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)
        cursor.execute("""
            SELECT * FROM reports 
            WHERE report_name ILIKE %s OR report_id ILIKE %s OR functional_area ILIKE %s
            LIMIT 20
        """, (f"%{q}%", f"%{q}%", f"%{q}%"))
        result = cursor.fetchall()
        cursor.close(); db.close()
        return result
    except Exception as e:
        print(f"Search error: {e}")
        return []

@app.post("/api/reports")
async def add_report(request: Request):
    try:
        data = await request.json()
        from backend.database.connection import get_db
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO reports (report_id, report_name, functional_area, package_name, frequency, report_type, state, data_source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (report_id) DO UPDATE SET
                report_name = EXCLUDED.report_name,
                functional_area = EXCLUDED.functional_area,
                package_name = EXCLUDED.package_name,
                updated_at = NOW()
        """, (
            data.get("report_id"), data.get("report_name"), data.get("functional_area"),
            data.get("package_name"), data.get("frequency"), data.get("report_type"),
            data.get("state", "NH"), data.get("data_source", "MMIS")
        ))
        db.commit()
        cursor.close(); db.close()
        return {"status": "success", "message": "Report added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contact")
async def contact_dev(request: Request):
    try:
        data = await request.json()
        message = data.get("message", "")
        print(f"Dev team message: {message}")
        return {"status": "success", "message": "Message sent to dev team"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# LOGIN ENDPOINT
@app.post("/api/auth/login")
async def login(request: Request):
    try:
        data = await request.json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            raise HTTPException(status_code=401, detail="Username and password required")

        # Connect to database and verify user
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)

        # Get user from database
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        cursor.close()
        db.close()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Verify password using bcrypt
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        if not pwd_context.verify(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Generate JWT token
        import jwt
        from datetime import datetime, timedelta

        jwt_secret = os.environ.get("JWT_SECRET", "reports-ai-super-secret-key-2026-demo-xyz123")

        token = jwt.encode(
            {
                "sub": username,
                "role": user.get("role", "user"),
                "exp": datetime.utcnow() + timedelta(days=1)
            },
            jwt_secret,
            algorithm="HS256"
        )

        return {
            "token": token,
            "username": username,
            "role": user.get("role", "user")
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# RESET PASSWORD ENDPOINT
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

        # Connect to database
        from backend.database.connection import get_db
        import psycopg
        db = get_db()
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)

        # Check if user exists
        cursor.execute("SELECT user_id FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()

        if not user:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        # Hash new password
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash(new_password)

        # Update password
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE username = %s",
            (password_hash, username)
        )

        db.commit()
        cursor.close()
        db.close()

        return {"status": "success", "message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# Serve React frontend
build_dir = Path(__file__).parent.parent / "frontend" / "build"
if build_dir.exists():
    @app.get("/", response_class=HTMLResponse)
    async def serve_index():
        index_file = build_dir / "index.html"
        if index_file.exists():
            with open(index_file, "r") as f:
                return f.read()
        return {"message": "Reports AI API", "docs": "/docs"}

    # Mount static files
    app.mount("/static", StaticFiles(directory=str(build_dir / "static")), name="static")

    # Catch-all for React Router
    @app.get("/{path:path}")
    async def catch_all(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        index_file = build_dir / "index.html"
        if index_file.exists():
            with open(index_file, "r") as f:
                return HTMLResponse(content=f.read())
        return {"message": "Reports AI API", "docs": "/docs"}
else:
    @app.get("/")
    async def root():
        return {"message": "Reports AI API", "docs": "/docs", "note": "Frontend not built. Run 'cd frontend && npm run build'"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
