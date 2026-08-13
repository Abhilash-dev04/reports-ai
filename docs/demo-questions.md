# Demo Questions

> Note: These example questions assume Full-Stack Mode with the backend
> search pipeline available. Frontend-only Demo Mode uses synthetic dashboard
> and review data and does not guarantee local search results unless a
> dedicated search mock is implemented.

## Requested Fields

```text
Give me package for Report ID DEMO-RPT-001
Give me output format and frequency for Report ID DEMO-RPT-002
Give me predecessor and successor for job name DEMO_JOB_003
Give me tables used for report name Provider Enrollment Summary
Give me data source for script name demo_provider_summary.sql
```

## Complete Details

```text
Show complete details for Report ID DEMO-RPT-001
Give me report details for report name Claims Payment Reconciliation
Show all metadata for job name DEMO_JOB_004
```

## Multi-Condition

```text
Show Report ID and Package for weekly reports from New Hampshire
Show PDF reports in the Provider Management module
Show reports using DEMO_PROVIDER from Alaska
```

## Stored QUERY

```text
Give me query for Report ID DEMO-RPT-001
Show stored SQL for job name DEMO_JOB_002
```

## Safety / No-Match

```text
Find a report using SELECT * FROM a_table
Give me package for Report ID UNKNOWN-999
Show New Hampshire reports while Alaska is selected
```
