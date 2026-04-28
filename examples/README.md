# Examples

**Copy-paste specs** and JSON bundles to learn Torqa in minutes. Everything here runs through the same **`torqa validate`** / **`torqa scan`** gates as production IR.

## Start here (2 minutes)

From the **repository root** after `pip install -e ".[dev]"` (see [README — Install](../README.md#install)):

```bash
torqa validate examples/templates/login_flow.tq
torqa scan examples/templates --profile default
```

| Path | What it is |
| --- | --- |
| **[templates/](templates/)** | Starter **`.tq`** flows (login, approval, onboarding) + safe/risky JSON pairs |
| **[integrations/](integrations/)** | n8n export examples for adapter-based `--source n8n` flows (`minimal_n8n.json` = safe baseline, `customer_support_n8n.json` = risky findings demo) |
| **[`approval_flow.tq`](approval_flow.tq)** | Single-file approval example at repo examples root |
| **[`ai_generated.json`](ai_generated.json)** | AI-style bundle JSON for guardrail demos |
| **[`ai_guardrail.md`](ai_guardrail.md)** | Command-oriented walkthrough |
| **[`ci_check.md`](ci_check.md)** | CI-oriented notes |
| **[`self_test_broken/`](self_test_broken/)** | **Intentionally invalid** specs for parser/policy tests — expect failures |

Deeper patterns (metadata, migration, CI): **[Examples guide](../docs/examples.md)** · **[First run](../docs/first-run.md)**.

## n8n safe vs risky demo

- **Safe baseline:** `examples/integrations/minimal_n8n.json`
  - Two-node flow with simple HTTP request.
  - Useful for a clean pass and baseline output.
- **Risky baseline:** `examples/integrations/customer_support_n8n.json`
  - Includes webhook trigger, code node, and side-effect HTTP/Slack path.
  - Useful for seeing meaningful findings and remediation hints.

Run both:

```bash
torqa validate examples/integrations/minimal_n8n.json --source n8n
torqa scan examples/integrations/customer_support_n8n.json --source n8n
torqa report examples/integrations/customer_support_n8n.json --format html -o torqa-n8n-risk-report.html
```
