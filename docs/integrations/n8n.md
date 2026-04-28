# n8n integration

## What this is (and is not)

- Torqa **does not execute** n8n workflows, does not call the n8n API, and does not need a running n8n instance. It only reads **offline exported JSON**.
- **n8n support is an adapter layer** (`src/torqa/integrations/n8n/`): exports are converted into the same **`ir_goal`** bundle as other inputs, then validated by the **source-agnostic** core (`validate_ir`, semantics, policy, trust scoring).
- The **canonical IR** uses **one** synthetic transition (`integration_external_step`, id `t_0001`) so the bundle satisfies IR rules that forbid duplicate `(effect, from_state, to_state)` triples. **Per-node** information is **not** lost: it lives in **`metadata.integration.findings`** (static rules with n8n node ids and names) and **`metadata.integration.transition_to_node.t_0001.n8n_nodes_ordered`** (ordered id / name / type list).
- **`torqa scan --source n8n --json`** adds an **`integration`** field on each row: **`findings`** map Torqa rule hits back to **n8n node identifiers and display names**; **`transition_to_node`** carries the IR-side mapping above.

Torqa can **scan** and **import** workflows exported from [n8n](https://n8n.io/) as JSON using the commands below.

## Quick demo

Use committed examples:

```bash
torqa validate examples/integrations/minimal_n8n.json --source n8n
torqa scan examples/integrations/customer_support_n8n.json --source n8n
torqa report examples/integrations/customer_support_n8n.json --format md -o customer_support_report.md
torqa import n8n examples/integrations/customer_support_n8n.json --out customer_support.bundle.json
```

- `minimal_n8n.json` is a safe baseline for first-pass validation.
- `customer_support_n8n.json` is intentionally riskier and should produce meaningful findings.

## Exporting from n8n

1. Open your workflow in the n8n editor.
2. Use the menu **⋯** (or **Workflow**) → **Download** / **Export** (wording depends on n8n version).
3. Save the file as JSON (single-workflow export). Torqa expects the usual export shape: top-level `nodes`, `connections`, and workflow metadata.

You can point Torqa at that file or a directory of `.json` exports.

## Commands

### Validate IR (via n8n adapter)

```bash
torqa validate ./my-workflow.json --source n8n
```

### Scan (trust summary + integration findings)

```bash
torqa scan ./path/to/workflows --source n8n
torqa scan ./single-workflow.json --source n8n --json
```

With `--source n8n`, scan only considers **`.json`** files under a directory.

### Import to a Torqa bundle file

```bash
torqa import n8n ./my-workflow.json --out ./my-workflow.tq.bundle.json
```

The output is a normal Torqa bundle (`{"ir_goal": ...}`) you can validate or feed into other tooling.

### Other CLI entry points

`inspect` and `doctor` also accept `--source n8n` when the input is an n8n export JSON file.

## What gets checked

Static analysis runs on the exported graph (no execution). Typical **findings** include:

| Area | What Torqa looks for |
|------|----------------------|
| **Credentials** | Nodes with credential references attached |
| **Code** | Code / Function nodes (custom logic) |
| **HTTP** | `n8n-nodes-base.httpRequest` without obvious error handling / continue-on-fail patterns (heuristic) |
| **HTTP transport** | plaintext `http://` targets and relaxed TLS flags (`ignoreSSLIssues`, `allowUnauthorizedCerts`) |
| **Webhooks** | Active workflow + webhook-style triggers (production exposure) |
| **Governance** | Heuristics such as side-effect nodes without a prior manual gate (e.g. approval / human-in-the-loop style nodes) |
| **Graph** | Disconnected nodes, disabled nodes, and missing retry/error/failure paths where detectable |
| **Secrets** | Hardcoded credential-like values in node parameters |

Each finding includes:

- **node name**
- **node type**
- **severity** (`info`, `review`, `high`)
- **fix_suggestion** (deterministic remediation hint)
- **n8n node id** for source mapping
- **rule id / message** for deterministic alerting and CI parsing

In human `torqa scan` output (non-JSON), Torqa prints a compact n8n findings table with severity, node, type, rule, and suggested fix.

## JSON scan output (`integration`)

When you use `torqa scan … --source n8n --json`, each row may include an `integration` object:

- `adapter`: `"n8n"`
- `findings`: array of rule hits (rule id, severity, message, fix suggestion, node refs)
- `transition_to_node`: maps synthetic IR transition id `t_0001` to `n8n_nodes_ordered` (ordered node list with ids, names, types) for traceability

## Limitations

- Analysis is **static** on the export only; runtime data and expressions are not evaluated.
- n8n versions differ slightly in node type strings and UI; rules are tuned to common `n8n-nodes-base.*` types.
- “Manual approval” detection is **heuristic** (node type / name patterns), not a guarantee of your org’s policy.

For Torqa’s own workflow language and CI usage, see [../quickstart.md](../quickstart.md) and [../ci-report.md](../ci-report.md).
