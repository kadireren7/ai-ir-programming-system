# Torqa reports in CI

For the **composite GitHub Action** that runs **`torqa scan`** / **`torqa validate`**, uploads **JSON**, and optionally comments on PRs, see **[GitHub Actions](github-actions.md)**.

Use **`torqa report`** to emit a **standalone HTML** file or a **Markdown** document suitable for **GitHub PR comments**, **job summaries**, or **uploaded artifacts**. Both formats use the same trust gate as **`torqa validate`** / **`torqa check`** (no workflow execution).

## Markdown (`--format md`)

The Markdown report includes:

- **Summary** — counts (total, safe, needs review, blocked)
- **Blocked files** — path and reason for each **BLOCKED** row
- **Recommendations** — deterministic bullets derived from failure patterns (metadata, parse, profile, etc.)
- **Full results** — table of every scanned file (decision, risk, profile, reasons, timestamp)

Default output file: **`torqa-report.md`** in the job working directory (override with **`-o`**).

**Exit code:** **`0`** if no file is **BLOCKED**; **`1`** if any file is **BLOCKED** (fail the job when you want a hard gate).

### Example (local)

```bash
pip install -e ".[dev]"
torqa report examples --format md -o torqa-report.md
```

### GitHub Actions — artifact

```yaml
- name: Torqa trust report (Markdown)
  run: |
    python -m torqa report examples --format md -o torqa-report.md
  env:
    PYTHONPATH: ${{ github.workspace }}

- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: torqa-report
    path: torqa-report.md
```

### GitHub Actions — step summary (optional)

After generating **`torqa-report.md`**, append it to **`$GITHUB_STEP_SUMMARY`** so it appears in the workflow UI:

```yaml
- name: Torqa report to step summary
  run: |
    python -m torqa report examples --format md -o torqa-report.md
    cat torqa-report.md >> "$GITHUB_STEP_SUMMARY"
  env:
    PYTHONPATH: ${{ github.workspace }}
```

On Windows runners, use PowerShell or a cross-platform approach to append; uploading the artifact is usually enough.

### PR comment (outline)

1. Run **`torqa report … --format md`** in CI.
2. Upload **`torqa-report.md`** as an artifact, or paste its contents into a comment step using **`gh pr comment`** / **`peter-evans/create-or-update-comment`** with the file body.

Keep secrets and tokens scoped; the report contains only spec paths and validation text from this repository.

## HTML (`--format html`)

Use **`--format html`** for a single offline-viewable page (embedded CSS). Default file: **`torqa-report.html`**. Same exit-code convention.

## See also

- [Quickstart](quickstart.md) — install and `torqa report` reference  
- [Trust layer](trust-layer.md) — what policy and risk mean  
- [Examples: CI snippets](../examples/ci_check.md) — `torqa validate` in CI  
