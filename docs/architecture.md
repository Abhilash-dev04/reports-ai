# Architecture

## System Context

```text
Browser / React
      |
      | HTTPS + JWT
      v
FastAPI Application
      |
      +-- Dashboard API
      +-- Traditional Search
      +-- Natural-Language Search
      +-- Review Workflow
      +-- Excel Ingestion
      |
      v
PostgreSQL + pgvector
```

## Backend Responsibilities

- Validate configuration and database schema at startup.
- Expose canonical snake_case JSON fields.
- Map canonical fields to physical report-table columns.
- Keep SQL values parameterized.
- Perform deterministic matching before vector fallback.
- Store QUERY while excluding QUERY from semantic embeddings.

## Search Layers

1. Traditional Report ID / Report Name lookup.
2. Natural-language requested-field detection.
3. Metadata filter and value extraction.
4. Active-state enforcement.
5. Exact identifier and report-name matching.
6. Condition coverage evaluation.
7. Semantic fallback through pgvector.
8. Requested-field-only or complete-detail response projection.

## Data Flow

```text
sample_reports.xlsx
      |
      v
upload_sample_reports.py
      |
      +-- validate columns
      +-- normalize values
      +-- build safe search text
      +-- generate 384-dimensional embedding
      +-- atomic upsert
      v
PostgreSQL reports table
```

      ## Execution Modes

      1. Public Frontend Demo Mode

         Browser
           -> React
           -> localStorage demo session
           -> local synthetic dashboard/reviewer data

         No backend or database is required for the supported demo screens.

      2. Full-Stack Mode

         Browser
           -> React
           -> FastAPI
           -> PostgreSQL + pgvector
           -> local embedding model

      - Demo Mode bypasses backend authentication only in the public showcase.
      - Full-Stack Mode uses real backend authentication and PostgreSQL.
      - Search and embedding capabilities belong to Full-Stack Mode unless explicit
        local search support is verified in code.

      ## Composite Business Key

```text
Report ID + Report Name + State
```

This permits equivalent report identifiers or names across states while
preventing a fully duplicate state-specific record.
