"""Reports AI Search - FastAPI Backend with ONNX Runtime."""
import os
import sys
import smtplib
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.config import settings
from backend.database.connection import get_db, init_db
from backend.embedding.model import encode_text
from backend.ingestion.cron import run_indexing

# ========== APP SETUP ==========
app = FastAPI(
    title="Reports AI Search API",
    description="AI-powered report search with ONNX Runtime",
    version="1.0.0"
)

# CORS - allow all for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React build files
if os.path.exists("frontend/build"):
    app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")

# In-memory notifications (demo only)
notifications = []

# ========== AUTH SETUP ==========
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo users (replace with DB in production)
DEMO_USERS = {
    "admin": pwd_context.hash("admin123"),
    "manager": pwd_context.hash("manager123"),
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

def verify_token(token: str = Header(None, alias="Authorization")):
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(token[7:], settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========== PYDANTIC MODELS ==========
class LoginRequest(BaseModel):
    username: str
    password: str

class SearchRequest(BaseModel):
    query: str
    state: Optional[str] = None
    limit: int = 20

class AddDataRequest(BaseModel):
    report_id: str
    report_name: str
    job_name: Optional[str] = ""
    functional_area: Optional[str] = ""
    package_name: Optional[str] = ""
    frequency: Optional[str] = ""
    report_type: Optional[str] = ""
    state: Optional[str] = "AK"
    data_source: Optional[str] = "MMIS"

class ContactDevRequest(BaseModel):
    question: str
    user_email: str
    user_name: str
    context: Optional[str] = ""

class NotifyRequest(BaseModel):
    type: str
    message: str
    file: Optional[str] = ""
    count: int = 0
    updated: int = 0

# ========== EXCEL SOURCE FILE HELPERS ==========
EXCEL_SOURCE_PATH = settings.EXCEL_SOURCE_PATH

def search_excel_source(query: str, state: Optional[str] = None) -> List[Dict]:
    """Search the source Excel file for matching records."""
    try:
        if not os.path.exists(EXCEL_SOURCE_PATH):
            return []

        df = pd.read_excel(EXCEL_SOURCE_PATH)

        # Search across text columns
        text_cols = ['report_name', 'report_id', 'job_name', 'functional_area', 'package_name']
        available_cols = [c for c in text_cols if c in df.columns]

        if not available_cols:
            return []

        mask = df[available_cols].astype(str).apply(
            lambda x: x.str.contains(query, case=False, na=False)
        ).any(axis=1)

        if state and 'state' in df.columns:
            mask = mask & (df['state'].astype(str).str.upper() == state.upper())

        results = df[mask].head(20).to_dict('records')

        # Convert NaN to None
        for result in results:
            for key, value in result.items():
                if pd.isna(value):
                    result[key] = None

        return results

    except Exception as e:
        print(f"Excel search error: {e}")
        return []

def add_to_excel(data: AddDataRequest):
    """Append new record to source Excel file."""
    try:
        if os.path.exists(EXCEL_SOURCE_PATH):
            df = pd.read_excel(EXCEL_SOURCE_PATH)
        else:
            df = pd.DataFrame()

        new_row = {
            'report_id': data.report_id,
            'report_name': data.report_name,
            'job_name': data.job_name,
            'functional_area': data.functional_area,
            'package_name': data.package_name,
            'frequency': data.frequency,
            'report_type': data.report_type,
            'state': data.state,
            'data_source': data.data_source,
        }

        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        os.makedirs(os.path.dirname(EXCEL_SOURCE_PATH), exist_ok=True)
        df.to_excel(EXCEL_SOURCE_PATH, index=False)
        return True

    except Exception as e:
        print(f"Excel update error: {e}")
        return False

def send_email_to_dev_team(question: str, user_email: str, user_name: str, context: str = ""):
    """Send email notification to Cognos Dev Team."""
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USER
        msg['To'] = settings.DEV_TEAM_EMAIL
        msg['Subject'] = "Reports AI: Data Update Request from User"

        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #2563EB;">Data Update Request</h2>
            <p><strong>From:</strong> {user_name} ({user_email})</p>
            <p><strong>Question Asked:</strong> {question}</p>
            <p><strong>Context:</strong> {context or "N/A"}</p>
            <p><strong>Timestamp:</strong> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            <hr>
            <p style="color: #666;">This is an automated request from the Reports AI Search system.</p>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
        server.quit()

        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False

# ========== API ENDPOINTS ==========

@app.get("/")
async def root():
    """Serve React app."""
    if os.path.exists("frontend/build/index.html"):
        return FileResponse("frontend/build/index.html")
    return {"message": "Reports AI API is running"}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ---------- AUTH ----------
@app.post("/auth/login")
async def login(req: LoginRequest):
    if req.username not in DEMO_USERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(req.password, DEMO_USERS[req.username]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": req.username, "role": req.username})
    return {"access_token": token, "token_type": "bearer", "username": req.username}

# ---------- DASHBOARD ----------
@app.get("/dashboard/summary")
async def dashboard_summary(state: Optional[str] = None, user=Depends(verify_token)):
    """Get dashboard metrics with optional state filter."""
    db = get_db()

    # Base query
    where_clause = ""
    params = []
    if state:
        where_clause = "WHERE state = %s"
        params = [state.upper()]

    # Total reports
    db.execute(f"SELECT COUNT(*) as total FROM reports {where_clause}", params)
    total = db.fetchone()['total']

    # Total by state
    db.execute("SELECT state, COUNT(*) as count FROM reports GROUP BY state")
    state_counts = {r['state']: r['count'] for r in db.fetchall()}

    # Module-wise (functional_area)
    db.execute(f"SELECT functional_area, COUNT(*) as count FROM reports {where_clause} GROUP BY functional_area ORDER BY count DESC", params)
    module_dist = [{"name": r['functional_area'] or "Unspecified", "value": r['count']} for r in db.fetchall()]

    # Frequency-wise
    db.execute(f"SELECT frequency, COUNT(*) as count FROM reports {where_clause} GROUP BY frequency ORDER BY count DESC", params)
    freq_dist = [{"name": r['frequency'] or "Unspecified", "value": r['count']} for r in db.fetchall()]

    # Package-wise
    db.execute(f"SELECT package_name, COUNT(*) as count FROM reports {where_clause} GROUP BY package_name ORDER BY count DESC LIMIT 10", params)
    pkg_dist = [{"name": r['package_name'] or "Unspecified", "value": r['count']} for r in db.fetchall()]

    # Data Source (MMIS vs ORR)
    db.execute(f"SELECT data_source, COUNT(*) as count FROM reports {where_clause} GROUP BY data_source", params)
    ds_dist = [{"name": r['data_source'] or "Unspecified", "value": r['count']} for r in db.fetchall()]

    # Recent additions
    db.execute(f"SELECT COUNT(*) as count FROM reports {where_clause} AND created_at >= CURRENT_DATE - INTERVAL '7 days'", params)
    recent = db.fetchone()['count']

    # Active vs Inactive
    db.execute(f"SELECT state_status, COUNT(*) as count FROM (SELECT CASE WHEN state = 'Inactive' THEN 'Inactive' ELSE 'Active' END as state_status FROM reports {where_clause}) t GROUP BY state_status", params if where_clause else [])
    status_counts = {}
    if state:
        db.execute("SELECT CASE WHEN state = 'Inactive' THEN 'Inactive' ELSE 'Active' END as state_status, COUNT(*) as count FROM reports WHERE state = %s GROUP BY state_status", [state])
        status_counts = {r['state_status']: r['count'] for r in db.fetchall()}
    else:
        db.execute("SELECT CASE WHEN state = 'Inactive' THEN 'Inactive' ELSE 'Active' END as state_status, COUNT(*) as count FROM reports GROUP BY state_status")
        status_counts = {r['state_status']: r['count'] for r in db.fetchall()}

    db.close()

    return {
        "total_reports": total,
        "state_counts": state_counts,
        "recent_additions": recent,
        "active_count": status_counts.get('Active', 0),
        "inactive_count": status_counts.get('Inactive', 0),
        "module_distribution": module_dist,
        "frequency_distribution": freq_dist,
        "package_distribution": pkg_dist,
        "data_source_distribution": ds_dist,
    }

# ---------- SEARCH ----------
@app.get("/search")
async def traditional_search(
    q: str = Query(..., description="Search query"),
    state: Optional[str] = None,
    limit: int = 20,
    user=Depends(verify_token)
):
    """Traditional keyword search in database."""
    db = get_db()

    where_clause = "WHERE (report_name ILIKE %s OR report_id ILIKE %s OR functional_area ILIKE %s OR package_name ILIKE %s)"
    params = [f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"]

    if state:
        where_clause += " AND state = %s"
        params.append(state.upper())

    db.execute(f"""
        SELECT id, report_id, job_name, report_name, functional_area, package_name,
               frequency, report_type, state, data_source, created_at
        FROM reports {where_clause}
        ORDER BY report_name
        LIMIT %s
    """, params + [limit])

    results = db.fetchall()
    db.close()

    return {"results": results, "count": len(results), "source": "database"}

@app.post("/search/nlp")
async def nlp_search(req: SearchRequest, user=Depends(verify_token)):
    """NLP semantic search using ONNX embeddings."""
    db = get_db()

    # Generate embedding
    embedding = encode_text(req.query)
    emb_str = f"[{','.join(str(x) for x in embedding)}]"

    # Vector similarity search
    where_clause = ""
    params = [emb_str]

    if req.state:
        where_clause = "AND state = %s"
        params.append(req.state.upper())

    db.execute(f"""
        SELECT id, report_id, job_name, report_name, functional_area, package_name,
               frequency, report_type, state, data_source,
               1 - (embedding <=> %s::vector) as similarity
        FROM reports
        WHERE embedding IS NOT NULL {where_clause}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """, params + [emb_str, req.limit])

    results = db.fetchall()
    db.close()

    return {"results": results, "count": len(results), "source": "database"}

@app.get("/search/check-excel")
async def check_excel_source(
    q: str = Query(..., description="Search query"),
    state: Optional[str] = None,
    user=Depends(verify_token)
):
    """Search source Excel file when DB has no results."""
    results = search_excel_source(q, state)
    return {"results": results, "count": len(results), "source": "excel"}

# ---------- ADD DATA ----------
@app.post("/add-data")
async def add_data(req: AddDataRequest, user=Depends(verify_token)):
    """Add missing data to DB first, then update Excel."""
    # 1. Generate search text and embedding
    search_text = f"{req.report_name} {req.functional_area} {req.package_name}"
    embedding = encode_text(search_text)
    emb_str = f"[{','.join(str(x) for x in embedding)}]"

    # 2. INSERT to database
    db = get_db(admin=True)

    # Check if report_id already exists
    db.execute("SELECT id FROM reports WHERE report_id = %s", (req.report_id,))
    existing = db.fetchone()

    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Report ID already exists")

    db.execute("""
        INSERT INTO reports (report_id, job_name, report_name, functional_area, package_name,
            frequency, report_type, state, data_source, search_text, embedding)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
    """, (
        req.report_id, req.job_name, req.report_name,
        req.functional_area, req.package_name,
        req.frequency, req.report_type, req.state, req.data_source,
        search_text, emb_str
    ))

    db.connection.commit()
    db.close()

    # 3. Update Excel file
    excel_success = add_to_excel(req)

    return {
        "success": True,
        "message": "Data added successfully",
        "report_id": req.report_id,
        "excel_updated": excel_success
    }

# ---------- CONTACT DEV TEAM ----------
@app.post("/contact-dev-team")
async def contact_dev_team(req: ContactDevRequest, user=Depends(verify_token)):
    """Send email to Cognos Dev Team."""
    email_sent = send_email_to_dev_team(req.question, req.user_email, req.user_name, req.context)

    return {
        "success": email_sent,
        "message": "Email sent to Cognos Dev Team" if email_sent else "Failed to send email"
    }

# ---------- NOTIFICATIONS ----------
@app.post("/api/notify")
async def notify(req: NotifyRequest, x_api_key: str = Header(None)):
    """Receive notifications (from Power Automate or upload script)."""
    if x_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    notifications.append({
        "type": req.type,
        "message": req.message,
        "file": req.file,
        "count": req.count,
        "updated": req.updated,
        "timestamp": datetime.utcnow().isoformat()
    })

    # Keep only last 50 notifications
    if len(notifications) > 50:
        notifications.pop(0)

    return {"success": True}

@app.get("/api/notify")
async def get_notifications(user=Depends(verify_token)):
    """Get recent notifications."""
    return {"notifications": notifications[-10:]}

# ---------- EXPORT ----------
@app.get("/export/excel")
async def export_excel(
    q: Optional[str] = None,
    state: Optional[str] = None,
    user=Depends(verify_token)
):
    """Export search results to Excel."""
    db = get_db()

    if q:
        db.execute("""
            SELECT * FROM reports 
            WHERE report_name ILIKE %s OR report_id ILIKE %s
            ORDER BY report_name
        """, [f"%{q}%", f"%{q}%"])
    else:
        db.execute("SELECT * FROM reports ORDER BY report_name")

    results = db.fetchall()
    db.close()

    df = pd.DataFrame(results)
    output_path = "/tmp/search_results.xlsx"
    df.to_excel(output_path, index=False)

    return FileResponse(output_path, filename="search_results.xlsx")

# ---------- SPA CATCH-ALL ----------
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve React SPA for all non-API routes."""
    if os.path.exists("frontend/build/index.html"):
        return FileResponse("frontend/build/index.html")
    return {"message": "Reports AI API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
