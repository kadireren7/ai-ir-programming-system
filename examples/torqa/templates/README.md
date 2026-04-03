# `.tq` templates

Install and first build: [`docs/QUICKSTART.md`](../../../docs/QUICKSTART.md).

Copy a file into your project, then from the **repository root** (after `pip install -e .`):

```bash
torqa surface your_copy.tq
torqa build your_copy.tq
```

| File | Use |
|------|-----|
| `minimal.tq` | Smallest valid file (empty `flow:`). |
| `minimal_form.tq` | Same shape as minimal; comments emphasize form-style inputs. |
| `session_only.tq` | Single effect: `create session` + optional `ensures session.created`. |
| `guarded_session.tq` | `forbid locked` + session (guard precondition; no explicit branch syntax in tq_v1). |
| `login_flow.tq` | Session + `emit login_success` (needs `ip_address` in `requires`). |
| `validation_rich_login.tq` | Full guard + ensures + audit line (copy-paste heavy validation pattern). |

Known-good build without copying: `torqa build examples/workspace_minimal/app.tq`.
