# Search Flow

> Note: This search pipeline describes Full-Stack Mode. Demo login and
> synthetic Dashboard/Review Requests do not invoke the search pipeline.
> PostgreSQL and the embedding model are required for actual search unless the
> code contains a verified local search mock.

## Traditional Search

```text
User enters Report ID or Report Name
  -> apply active state scope
  -> parameterized ILIKE lookup
  -> return complete metadata
  -> display stored QUERY without executing it
```

Traditional Search checks Report ID and Report Name. State is a mandatory
scope when a specific state is selected.

## Natural-Language Search

```text
Question
  -> reject unsafe unanchored raw SQL
  -> detect complete-details intent
  -> detect requested output fields
  -> extract metadata filters and values
  -> normalize state/frequency categories
  -> enforce active state selection
  -> exact identifier or report-name lookup
  -> metadata condition coverage
  -> semantic fallback only when allowed
  -> response projection
```

## Example Interpretation

Question:

```text
Give me package for Report ID DEMO-RPT-001
```

Interpretation:

```json
{
  "requested_fields": ["package_name"],
  "filters": {"report_id": ["DEMO-RPT-001"]},
  "return_all_fields": false,
  "semantic_fallback_used": false
}
```

## State Rules

- `all`: search all states and include State in each result.
- `AK`, `NH`, or `ND`: return only the selected state.
- An explicit question state conflicts with a different active state and
  produces a clear conflict response.
- State filtering applies to deterministic and semantic paths.
