# Synthetic Sample Data

`sample_reports.xlsx` is a fictional dataset created for portfolio and testing
purposes. It contains no production report metadata or organization data.

## Workbook Contract

The worksheet is named `Reports` and contains these 16 headers:

```text
Report ID
Job Name
Report Description
Module
Package
Script Name
Output Format
Frequency
Report Type
State
Data Source
Predecessor
Successor
Tables Used
Columns In Tables
QUERY
```

## Business Identity

A report row is uniquely identified by:

```text
Report ID + Report Description + State
```

## Safety

The QUERY values are harmless demonstration SELECT statements. Do not replace
the workbook with an organizational export in the public repository.

- Frontend Demo Mode uses local JavaScript fixture data and does not require
  `sample_reports.xlsx` to display the dashboard and Review Requests pages.
- `sample_reports.xlsx` is used by the optional full-stack ingestion workflow.
