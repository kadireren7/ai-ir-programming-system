# Torqa GitHub Action

Official **composite action** at [`.github/actions/torqa`](../.github/actions/torqa/action.yml): install Torqa from the repository, run **`torqa scan`** (default) or **`torqa validate`**, **fail the job** on violations, optionally **upload a JSON report** artifact, and **comment a short summary** on pull requests.

For HTML/Markdown reports from **`torqa report`**, see [CI reports](ci-report.md).

## Behavior

| Topic | Behavior |
| --- | --- |
| Gate | Non-zero Torqa exit code fails the step (and the job unless you handle it). |
| Strictness | Set **`profile`** (`default`, `strict`, `review-heavy`, `enterprise`). Set **`fail-on-warning`** to `true` to treat semantic/policy warnings as failures (same as CLI `--fail-on-warning`). |
| Report | **`--json`** output is written to **`json-report-filename`** at the workspace root, then uploaded as an artifact when **`upload-artifact`** is `true`. Schema is **`torqa.cli.scan.v1`** for scan and **`torqa.cli.validate.v1`** for validate. |
| PR comment | Markdown summary from the JSON file. Requires **`pull_request`**, **`comment-on-pr: true`**, and a token with **`pull-requests: write`**. Comments from **`GITHUB_TOKEN`** do not run for PRs from forks (permission denied); use org policy or skip comments for forks. |

## Permissions

Minimal job when you only need fail/pass and artifacts:

```yaml
permissions:
  contents: read
```

Add PR comments:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## Usage (this repository)

Reference the action with a repository-relative path:

```yaml
- uses: ./.github/actions/torqa
  id: torqa
  with:
    torqa-package-path: .
    scan-path: examples/integrations
    profile: default
    upload-artifact: true
    artifact-name: torqa-report
    json-report-filename: torqa-ci-report.json
```

Minimal copy-paste workflow:

```yaml
name: Torqa CI gate

on:
  pull_request:
    paths:
      - "**.json"
      - "**.tq"

permissions:
  contents: read

jobs:
  torqa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/torqa
        with:
          torqa-package-path: .
          scan-path: examples/integrations
          profile: default
          upload-artifact: true
```

Optional PR comment (already supported):

```yaml
permissions:
  contents: read
  pull-requests: write

steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/torqa
    with:
      torqa-package-path: .
      scan-path: examples/integrations
      profile: default
      upload-artifact: true
      comment-on-pr: true
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

Read outputs in later steps:

```yaml
- run: echo "exit=${{ steps.torqa.outputs.exit-code }} report=${{ steps.torqa.outputs.report-path }}"
```

## Usage (another repository)

Check out **your** repo and **Torqa** side by side, then run the composite from the Torqa tree (path is relative to the workflow’s repository; after `path: torqa`, use `./torqa/.github/actions/torqa`).

```yaml
- uses: actions/checkout@v4

- uses: actions/checkout@v4
  with:
    repository: your-org/torqa
    path: torqa
    ref: v0.1.0

- uses: ./torqa/.github/actions/torqa
  with:
    torqa-package-path: torqa
    scan-path: ${{ github.workspace }}/workflows
    profile: strict
```

`scan-path` / `validate-file` are relative to **`working-directory`** (default `.`, the job’s default checkout root). Example: **`scan-path: workflows`**.

**Note:** `uses: your-org/torqa/.github/actions/torqa@<ref>` only downloads the **action** metadata from that ref. It does **not** place the full Torqa package on disk. You still need a checkout, submodule, or other copy of Torqa so that **`torqa-package-path`** points at a directory that contains **`pyproject.toml`** (same as the two-checkout example above). Alternatively, install Torqa with **`pip`** in an earlier step and extend this action in a fork to skip the editable install.

If Torqa is **vendored** in your repo:

```yaml
- uses: actions/checkout@v4

- uses: ./third_party/torqa/.github/actions/torqa
  with:
    torqa-package-path: third_party/torqa
    scan-path: workflows
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `torqa-package-path` | `.` | Directory with **`pyproject.toml`**, relative to repository root. |
| `working-directory` | `.` | Directory from which **`scan-path`** / **`validate-file`** are resolved. |
| `scan-path` | `.` | Path passed to **`torqa scan`** (directory or file). Ignored if **`validate-file`** is set. |
| `validate-file` | *(empty)* | If set, runs **`torqa validate`** on this path instead of scan. |
| `profile` | `default` | Trust profile: **`default`**, **`strict`**, **`review-heavy`**, **`enterprise`**. |
| `fail-on-warning` | `false` | Maps to **`--fail-on-warning`**. |
| `python-version` | `3.11` | Passed to **`actions/setup-python`**. |
| `upload-artifact` | `true` | Upload JSON report via **`actions/upload-artifact`**. Runs **`if: always()`** so the file is kept when Torqa fails. |
| `artifact-name` | `torqa-report` | Artifact name. |
| `json-report-filename` | `torqa-ci-report.json` | File name under **`github.workspace`**. |
| `comment-on-pr` | `false` | Post a summary comment on **`pull_request`**. |
| `github-token` | *(empty)* | Use **`secrets.GITHUB_TOKEN`** when **`comment-on-pr`** is true. |

## Outputs

| Output | Description |
| --- | --- |
| `exit-code` | Torqa process exit code. |
| `report-path` | Absolute path to the JSON report file. |

## Workflow examples (copy-paste)

### Pull request — scan and comment

```yaml
name: Torqa

on:
  pull_request:
    paths:
      - '**.tq'
      - '**.json'
      - '.github/workflows/torqa.yml'

permissions:
  contents: read
  pull-requests: write

jobs:
  trust-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/torqa
        with:
          torqa-package-path: .
          scan-path: examples/templates
          profile: strict
          comment-on-pr: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Validate a single bundle file

```yaml
- uses: ./.github/actions/torqa
  with:
    torqa-package-path: .
    validate-file: specs/handoff.tq
    profile: enterprise
    fail-on-warning: true
```

### Matrix — multiple profiles

```yaml
jobs:
  torqa:
    strategy:
      matrix:
        profile: [default, strict, review-heavy]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/torqa
        with:
          torqa-package-path: .
          scan-path: examples/templates
          profile: ${{ matrix.profile }}
          artifact-name: torqa-${{ matrix.profile }}
          json-report-filename: torqa-${{ matrix.profile }}.json
          comment-on-pr: false
```

### Continue on failure but still upload

The upload step already runs **`if: always()`** inside the composite action. The **Run Torqa** step still fails the job; to **not** fail the job while keeping the artifact, wrap the action in a step with **`continue-on-error: true`** (not recommended for a hard gate).

## Repository workflows

This repo ships:

- **[`.github/workflows/torqa-pr.yml`](../.github/workflows/torqa-pr.yml)** — runs on pull requests (path filters) with scan + PR comment.
- **[`.github/workflows/torqa-action-examples.yml`](../.github/workflows/torqa-action-examples.yml)** — **`workflow_dispatch`** jobs demonstrating scan vs validate.

Trust profiles in detail: [Trust profiles](trust-profiles.md).
