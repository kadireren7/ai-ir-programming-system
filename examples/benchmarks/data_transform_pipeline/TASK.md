# Task: data transformation pipeline

## Natural language description

Define a “pipeline run” that ingests a logical record (`source_record`) after the user authenticates. The pipeline validates credentials, accepts the inbound record payload, and stages it for downstream processing. Success is a named terminal state meaning the record is staged (no full ETL implementation required in this benchmark—only the contract).

## Expected behavior

- Required inputs: `username`, `password`, `source_record`.
- User must be authenticated before the record is accepted.
- Successful completion returns a terminal outcome equivalent to “Staged”.
- The record may be opaque (string or structured); the contract only requires it to be present.
