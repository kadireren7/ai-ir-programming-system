# Public API contract (v0.1.5)

Torqa currently exposes a public scan endpoint in the dashboard app:

- `POST /api/public/scan`

This route is designed for API-key based integrations and returns an envelope-first response shape by default.

## Response envelope

### Success shape

```json
{
  "ok": true,
  "data": {},
  "meta": { "requestId": "req_..." }
}
```

### Error shape

```json
{
  "ok": false,
  "error": {
    "code": "bad_request",
    "message": "Human-readable error text"
  },
  "meta": { "requestId": "req_..." }
}
```

### Legacy compatibility

- Add `?legacy=1` (or `?legacy=true`) to `POST /api/public/scan` to receive the legacy raw payload shape.
- This exists for incremental adoption by existing callers.

## Public scan request

`POST /api/public/scan`

Expected JSON body:

```json
{
  "source": "n8n",
  "content": {},
  "policyTemplateSlug": "strict-security",
  "workspacePolicyId": "optional-uuid"
}
```

Notes:

- `source` must be `n8n` or `generic`.
- `content` must be a JSON object.
- Public API keys can apply personal workspace policies; invalid policy identifiers return `bad_request`.

## Report artifact formats

The CLI report command supports:

- `html` -> human-shareable standalone report
- `md` -> markdown for PRs/notes
- `json` -> machine-shareable artifact

Example:

```bash
torqa report examples/integrations/customer_support_n8n.json --format json -o torqa-report.json
```

JSON report schema id:

- `torqa.report.v1`

## Stability note

The envelope shape above is stable for `POST /api/public/scan` in v0.1.5.
Full API versioning across all dashboard routes is future work and not yet a repository-wide guarantee.
