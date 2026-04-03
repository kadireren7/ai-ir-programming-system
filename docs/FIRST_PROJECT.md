# First project (after Quick Start)

You already ran [QUICKSTART.md](QUICKSTART.md) for **TORQA**. This page is the **next** small loop: own a file, rebuild, optionally use a package.

## 1. Own a `.tq` file

1. Copy a template from [`examples/torqa/templates/`](../examples/torqa/templates/) (`minimal.tq`, `minimal_form.tq`, `session_only.tq`, `guarded_session.tq`, `login_flow.tq`, `validation_rich_login.tq`) or [`examples/workspace_minimal/app.tq`](../examples/workspace_minimal/app.tq) into a folder you control.
2. From that folder (or pass the full path):

   ```bash
   torqa build ./your_app.tq
   ```

3. Change `intent` / `requires` / `flow:` slightly, run `torqa build` again. Use [`docs/TQ_AUTHOR_CHEATSHEET.md`](TQ_AUTHOR_CHEATSHEET.md) when stuck.

## 2. Optional: IR package + compose

When you want **reusable IR fragments** (not the same as `.tq` `include` — see [USING_PACKAGES.md](USING_PACKAGES.md)):

1. Follow [USING_PACKAGES.md](USING_PACKAGES.md) using **`examples/packages/minimal_auth`** + **`examples/package_demo/`**.
2. Sharing tarballs/registry: [PACKAGE_DISTRIBUTION.md](PACKAGE_DISTRIBUTION.md).

## 3. Where everything lives

- **CLI / help:** `torqa --help` and `torqa build --help`
- **Doc hub:** [DOC_MAP.md](DOC_MAP.md)
