# Prototype security notice

TORQA is an **early architecture prototype**, not a hardened production platform.

- Generated web apps and server stubs are **demonstration projections**. Do not expose them to the public internet without a full security review.
- The site server (`website/server/`) runs a local FastAPI app. Bind to `127.0.0.1` for local trials; do not run it as a multi-tenant service without authentication and isolation.
- A **prototype in-memory rate limit** applies to `/api/*` (see `website/server/middleware_rate_limit.py`). Replace with Redis or edge rate limiting before any public deployment.
- The Rust bridge executes `cargo run` from the repository. Only run IR bundles you trust; treat the console as a **developer tool**, not an anonymous endpoint.
- Demo inputs and execution paths use registry-backed stubs. Real authentication, storage, and policy enforcement are **out of scope** for this repository revision.

**Secrets:** Never commit API keys. Use a root `.env` file (gitignored) or your OS environment. The web app loads `.env` / `.env.local` via `python-dotenv` when present. If a key was pasted into chat or committed by mistake, **revoke it immediately** in the provider dashboard and create a new key.

When moving toward production, add threat modeling, sandboxed execution, secret management, and rate limiting appropriate to your deployment.
