# Reports AI Search

AI-powered report inventory search dashboard with ONNX Runtime embeddings.

## Architecture

- **Frontend**: React + Recharts (blue/white theme)
- **Backend**: FastAPI + ONNX Runtime
- **Database**: Supabase PostgreSQL + pgvector
- **AI Model**: all-MiniLM-L6-v2 (ONNX format, ~30MB)

## Setup

### 1. Convert Model (Run on your laptop)
```bash
pip install transformers torch tokenizers
python scripts/convert_model.py
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Initialize Database
```bash
python -c "from backend.database.connection import init_db; init_db()"
```

### 5. Upload Demo Data
```bash
python scripts/upload_reports.py --file your_data.xlsx
```

### 6. Run Locally
```bash
uvicorn backend.main:app --reload
```

## Deploy to Render

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables in Render Dashboard
4. Deploy

## Features

- **Dashboard**: Executive-level overview with state filters (AK, NH, ND)
- **Search**: Traditional keyword + NLP semantic search
- **Add Data**: UI-driven data entry (no scheduler needed)
- **Contact Dev Team**: Email notification for missing data
- **ONNX Runtime**: 100% offline, no external AI APIs

## Demo Credentials

- Username: `admin` / Password: `admin123`
- Username: `manager` / Password: `manager123`
