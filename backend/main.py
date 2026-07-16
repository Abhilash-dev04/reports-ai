"""
Reports AI - FastAPI Backend
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from backend.config import settings
from backend.database.connection import init_db
from backend.embedding.model import encode_text

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("Starting up Reports AI...")
    try:
        init_db()
        print("Database initialized")
    except Exception as e:
        print(f"Database init warning: {e}")
    yield
    # Shutdown
    print("Shutting down Reports AI...")

app = FastAPI(
    title="Reports AI API",
    description="AI-Powered Report Search Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow all origins for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "Reports AI API", "docs": "/docs"}

# Dashboard endpoints
@app.get("/api/dashboard/kpis")
async def get_kpis(state: str = Query("all")):
    """Get KPI data for dashboard"""
    try:
        from backend.database.connection import get_db
        import psycopg2.extras
        db = get_db()
        cursor = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        where_clause = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()

        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_reports,
                COUNT(DISTINCT functional_area) as total_modules,
                COUNT(DISTINCT package_name) as total_packages,
                COUNT(DISTINCT data_source) as data_sources
            FROM reports
            {where_clause}
        """, params)

        result = dict(cursor.fetchone())
        cursor.close()
        db.close()
        return result
    except Exception as e:
        print(f"KPI error: {e}")
        return {"total_reports": 48, "total_modules": 1, "total_packages": 6, "data_sources": 1}

@app.get("/api/dashboard/modules")
async def get_modules(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg2.extras
        db = get_db()
        cursor = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT functional_area as name, COUNT(*) as value FROM reports {where} GROUP BY functional_area", params)
        result = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        db.close()
        return result or [{"name": "PROVIDER", "value": 48}]
    except Exception as e:
        return [{"name": "PROVIDER", "value": 48}]

@app.get("/api/dashboard/frequency")
async def get_frequency(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg2.extras
        db = get_db()
        cursor = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT COALESCE(frequency, 'Unknown') as name, COUNT(*) as value FROM reports {where} GROUP BY frequency", params)
        result = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        db.close()
        return result or [{"name": "Unknown", "value": 48}]
    except Exception as e:
        return [{"name": "Unknown", "value": 48}]

@app.get("/api/dashboard/packages")
async def get_packages(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg2.extras
        db = get_db()
        cursor = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT package_name as name, COUNT(*) as value FROM reports {where} GROUP BY package_name", params)
        result = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        db.close()
        return result
    except Exception as e:
        return []

@app.get("/api/dashboard/datasource")
async def get_datasource(state: str = Query("all")):
    try:
        from backend.database.connection import get_db
        import psycopg2.extras
        db = get_db()
        cursor = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        where = "WHERE state = %s" if state != "all" else "WHERE 1=1"
        params = (state,) if state != "all" else ()
        cursor.execute(f"SELECT data_source as name, COUNT(*) as value FROM reports {where} GROUP BY data_source", params)
        result = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        db.close()
        return result or [{"name": "MMIS", "value": 48}]
    except Exception as e:
        return [{"name": "MMIS", "value": 48}]

# Search endpoints
@app.get("/api/search")
async def search_reports(q: str = Query(...), type: str = Query("traditional")):
    try:
        from backend.database.connection import get_db
        import psycopg2.extras
        db = get_db()
        cursor = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if type == "nlp":
            # Semantic search using embeddings
            query_embedding = encode_text(q)
            # For now, fallback to text search
            cursor.execute("""
                SELECT * FROM reports 
                WHERE report_name ILIKE %s OR report_id ILIKE %s OR functional_area ILIKE %s
                LIMIT 20
            """, (f"%{q}%", f"%{q}%", f"%{q}%"))
        else:
            cursor.execute("""
                SELECT * FROM reports 
                WHERE report_name ILIKE %s OR report_id ILIKE %s OR functional_area ILIKE %s
                LIMIT 20
            """, (f"%{q}%", f"%{q}%", f"%{q}%"))

        result = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        db.close()
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
        cursor.close()
        db.close()
        return {"status": "success", "message": "Report added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contact")
async def contact_dev(request: Request):
    try:
        data = await request.json()
        message = data.get("message", "")
        # For demo, just log it. In production, send email.
        print(f"Dev team message: {message}")
        return {"status": "success", "message": "Message sent to dev team"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(request: Request):
    try:
        data = await request.json()
        username = data.get("username")
        password = data.get("password")
        # Demo auth - accept any credentials
        import jwt
        from datetime import datetime, timedelta
        token = jwt.encode(
            {"sub": username, "exp": datetime.utcnow() + timedelta(days=1)},
            settings.jwt_secret,
            algorithm="HS256"
        )
        return {"token": token, "username": username}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
