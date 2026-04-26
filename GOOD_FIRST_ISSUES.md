# Good first issues (starting points)

This list is **guidance**, not a guarantee that every item is easy for every contributor. Torqa sits at the boundary of **text parsing**, **IR**, and **trust rules**—some areas need careful reading of existing tests before you change behavior.

If you are new, start with **documentation** or **tests**; they teach you the repo without locking in API decisions.

---

## Usually approachable

| Area | Why | Hints |
|------|-----|--------|
| **Docs** | Typos, broken links, clarifying [Quickstart](docs/quickstart.md) or [FAQ](docs/faq.md) | Match what the CLI and code actually do; avoid promising features that are not implemented. |
| **Examples** | Align `examples/` or [docs/examples.md](docs/examples.md) with parser and policy reality | Run `torqa validate` on sample files you touch. |
| **Tests** | Add edge cases for JSON loading, CLI flags, or error messages | Follow patterns in `tests/test_cli_*.py` and `tests/test_bundle_load.py`. |
| **Error messages** | Clearer load/parse messages (with path hints where applicable) | Small diffs; keep messages deterministic. |

---

## Needs more context (still welcome)

| Area | Why | Hints |
|------|-----|--------|
| **`.tq` surface** (`src/torqa/surface/`) | Parser changes affect all authors; errors use stable **`PX_TQ_*`** codes | Read nearby tests; avoid changing codes without a strong reason. |
| **CLI** (`src/torqa/cli/`) | Users script against stdout/stderr and exit codes | Add tests; check [docs/quickstart.md](docs/quickstart.md). |
| **Policy / semantics** | Rules are deterministic and documented in `docs/trust-*.md` | Prefer an issue to agree on behavior before large edits. |

---

## Typically *not* good first issues

- **Breaking IR or bundle shape** without `ir_version` / migration discussion.
- **New effect names** in the default registry without tests and semantic review.
- **Runtime, orchestration, or cloud integrations** — out of scope for this repository ([Roadmap](docs/roadmap.md)).

---

## How to pick work

1. Read **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[docs/architecture.md](docs/architecture.md)** (including contribution notes at the bottom).
2. Open the repo **Issues** (see `pyproject.toml` → `[project.urls]` → Issues) and look for labels like `good first issue` if maintainers add them—or file a short issue describing what you plan to do.
3. Prefer **one logical change per PR** so review stays fast.

If you get stuck, a short issue or draft PR with a question is OK. Clear questions get clearer answers.
