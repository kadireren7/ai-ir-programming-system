# AI boundary

- AI is a **proposal engine** only. It never bypasses `validate_ir`, handoff checks, or semantic verification.
- Adapter: `src/ai/adapter.py` — OpenAI Chat Completions with `response_format: json_object`, `jsonschema` on the bundle, bounded retries with verifier feedback.
- Authoring contract (system prompt + reference payload): `src/language/authoring_prompt.py` — stays aligned with `default_ir_function_registry` and handoff rules. CLI: `TORQA language`.
- Secrets: `OPENAI_API_KEY` via environment or `.env` (gitignored); never commit keys.
- Outputs: either accepted IR bundle or structured failure with codes (`PX_AI_*`).
