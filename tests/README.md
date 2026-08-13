# Test Portfolio

Copy sanitized tests into this directory or retain the project's existing test
layout. Public tests should demonstrate:

- requested output fields vs. filter fields
- exact Report ID matching
- multi-word Report Name parsing
- state normalization and conflicts
- QUERY exclusion from embeddings
- raw SQL rejection
- composite-key upload behavior
- Traditional Search returning complete details

Use synthetic fixtures only.

Public demo testing should include:

- Demo login with a standard user.
- Reviewer-role login.
- Administrator-role login.
- No Axios authentication request in Demo Mode.
- Correct localStorage token and role values.
- Standard User blocked from `/review-requests`.
- Reviewer and Administrator allowed into `/review-requests`.
- Synthetic Dashboard rendering without the backend.
- Synthetic Review Requests rendering without the backend.
- Empty or malformed review-response handling.
- Production build validation.

## Recommended Commands

Run the production build:

```powershell
cd frontend
npm run build
```

Run the frontend tests when the project supports them:

```powershell
cd frontend
$env:CI = "true"
npm test -- --watchAll=false --runInBand
```
