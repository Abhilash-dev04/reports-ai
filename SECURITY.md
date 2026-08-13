# Security Policy

## Reporting a Vulnerability

Do not open a public issue containing exploit details, credentials, private
URLs, or sensitive data. Contact the repository owner privately through the
security contact listed on the GitHub profile.

## Repository Safety Rules

- Never commit `.env`, tokens, passwords, database URLs, certificates, or keys.
- Use `.env.example` with placeholders only.
- Use synthetic data in public examples and screenshots.
- Do not publish production SQL, customer metadata, employee information, or
  organization-only documentation.
- Rotate any credential immediately if it is accidentally committed.
- Keep GitHub push protection, secret scanning, and Dependabot enabled.

## Application Controls

- Use parameterized SQL for every user-supplied value.
- Translate only allowlisted canonical field names into SQL identifiers.
- Never execute stored or user-supplied report SQL.
- Exclude `report_query` from embedding input.
- Validate uploaded workbook headers, required values, duplicate keys, and
  embedding dimensions before committing a transaction.

## Public Demo Mode

- Demo authentication is not real authentication.
- Demo roles are simulated in the browser and are not a substitute for backend
  authorization.
- Demo Mode must never be enabled in production.
- Real secrets must never be stored in `REACT_APP_*` environment variables.
- Values beginning with `REACT_APP_` are included in the frontend bundle.
- Demo Mode uses synthetic data only.
- Private or organizational deployments must use backend authentication and
  server-side role authorization.
- Frontend route guards are not security boundaries.
- Production authorization must always be enforced by the backend.
