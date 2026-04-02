# vscode-torqa extension (syntax)

This folder holds the **TextMate grammar** for `.tq` in VS Code / Cursor.

## Tasks (F3.3)

Copy [`tasks.json`](tasks.json) into your workspace **`.vscode/tasks.json`** (this repo ignores `.vscode/` in git), or merge its `tasks` array into an existing file.

| Task | When to use |
|------|-------------|
| `torqa: surface (compile .tq)` | Active file is `.tq` — writes `ir_bundle.json` next to it |
| `torqa: project (materialize tree)` | Active file is `.tq` or bundle JSON — writes under workspace `generated_out/` |
| `torqa: validate current JSON bundle` | Active file is a bundle `.json` |

Run via **Terminal → Run Task…** after `pip install -e .` from the repo root.

Roadmap: [`docs/TORQA_NIHAI_VISION_ROADMAP.md`](../../docs/TORQA_NIHAI_VISION_ROADMAP.md) (F1 commands).
