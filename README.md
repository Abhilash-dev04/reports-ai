# AI Report Metadata Explorer

A sanitized portfolio project demonstrating deterministic metadata retrieval,
natural-language search, PostgreSQL/pgvector, local embeddings, Excel
ingestion, a FastAPI backend, and a React user interface.

> **Portfolio disclaimer:** Every report, identifier, SQL statement, user,
> organization name, and screenshot in this repository must be synthetic.
> This repository contains no employer source code, production credentials,
> customer information, or proprietary report metadata.

## Skills Demonstrated

- Python, FastAPI, REST APIs, and layered backend design
- PostgreSQL, pgvector, parameterized SQL, and schema mapping
- Natural-language parsing into requested fields and metadata filters
- Exact identifier-first retrieval with controlled semantic fallback
- 384-dimensional local embeddings with QUERY excluded from embedding input
- React result cards, multi-state filtering, and requested-field projection
- Excel ingestion and PostgreSQL upsert using a composite business key
- Unit tests, security controls, and deployment-ready configuration

## Architecture

```text
React UI
   |
   v
FastAPI API
   |
   +--> Deterministic metadata search
   +--> Natural-language parser
   +--> Embedding fallback
   |
   v
PostgreSQL + pgvector
```

See [docs/architecture.md](docs/architecture.md) and
[docs/search-flow.md](docs/search-flow.md).

## Public Frontend Demo

The frontend supports a public demo mode using local synthetic data when
`REACT_APP_DEMO_MODE=true` in `frontend/.env`.

In Public Frontend Demo Mode:

- Any non-empty username and password are accepted.
- `demo` is treated as a standard user.
- `reviewer` is treated as a reviewer.
- `admin` is treated as an administrator.
- Any other non-empty username is treated as a standard user.
- No credentials are sent to the backend while Demo Mode is enabled.
- No request is sent to `/api/auth/login`.
- Dashboard and review-request screens use local synthetic data.
- The browser stores only temporary demo data in `localStorage`.
- Demo data is synthetic and no real account is created.
- Clear stale demo storage with `localStorage.clear();`.

From the `frontend` directory:

```powershell
Copy-Item .env.example .env -Force
npm ci
npm start
```

Open the public demo login page at:

`http://localhost:3000/login`

Demo credentials:

- `demo` / any non-empty password — Standard User
- `reviewer` / any non-empty password — Reviewer
- `admin` / any non-empty password — Administrator
- any other non-empty username — Standard User

## Synthetic Dataset

`data/sample_reports.xlsx` contains fictional records with the same 16-column
shape used by the ingestion pipeline:

1. Report ID
2. Job Name
3. Report Description
4. Module
5. Package
6. Script Name
7. Output Format
8. Frequency
9. Report Type
10. State
11. Data Source
12. Predecessor
13. Successor
14. Tables Used
15. Columns In Tables
16. QUERY

## Natural-Language Examples

- `Give me package for Report ID DEMO-RPT-001`
- `Show Report ID and Module for weekly reports from New Hampshire`
- `Show complete details for report name Provider Enrollment Summary`
- `Give me query for Report ID DEMO-RPT-001`

More examples are in [docs/demo-questions.md](docs/demo-questions.md).

## Full-Stack Setup

The complete full-stack application requires backend Python dependencies,
PostgreSQL with the `pgvector` extension, a local embedding model, and workbook
ingestion.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Configure a local PostgreSQL database with pgvector, then upload the synthetic
workbook:

```powershell
python scripts\upload_sample_reports.py --file "data\sample_reports.xlsx"
```

Start the API:

```powershell
python backend\main.py
```

Build the frontend from the `frontend` directory:

```powershell
npm ci
npm run build
```

## Security Design

- Secrets are read from environment variables and never committed.
- SQL values are parameterized.
- Canonical field allowlists map to physical database columns.
- Stored QUERY can be displayed but is never executed.
- Stored QUERY is excluded from embeddings.
- Raw SQL submitted as an unanchored search request is rejected.
- Public sample data is synthetic.

See [SECURITY.md](SECURITY.md).

## Public vs. Internal Repositories

This showcase repository must remain sanitized. The organizational version
should live in a separate private repository owned by the organization and
must follow internal source-control, legal, and security policies.

## License

MIT. See [LICENSE](LICENSE).
