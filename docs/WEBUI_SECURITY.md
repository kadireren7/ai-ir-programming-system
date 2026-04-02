# Web UI security notes (F4.2)

## `POST /api/materialize-project-zip`

- **Design:** Server builds artifacts in a **temporary directory** and streams a **zip** to the client. **No** user-supplied filesystem path on the server → mitigates arbitrary file write / traversal from the API body.
- **Severity (conceptual):** Unauthenticated zip generation is **low–medium** (CPU/DoS); rate limiting applies (`RateLimitMiddleware`).

## Path sanitization inside zips / disk writes

- **`sanitize_archive_path`** (`src/project_materialize.py`) rejects `..`, absolute paths, and empty names in artifact `filename` fields before writing or zipping — mitigates **zip-slip**-style abuse if a malicious IR ever reached the orchestrator.

## Not done (explicit non-goals without auth)

- **`POST /api/materialize-project`** writing to an arbitrary server path — **not implemented**; would require authentication and strict path allow-lists.

See [`TORQA_NIHAI_VISION_ROADMAP.md`](TORQA_NIHAI_VISION_ROADMAP.md) F3/F4 prompts.
