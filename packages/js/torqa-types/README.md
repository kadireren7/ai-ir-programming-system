# @torqa/types-stub

Placeholder for a future thin **JavaScript/TypeScript** SDK that mirrors the same **IR bundle schema** as the Python `torqa` package ([`docs/PACKAGE_SPLIT.md`](../../../docs/PACKAGE_SPLIT.md), [`docs/TORQA_VISION_NORTH_STAR.md`](../../../docs/TORQA_VISION_NORTH_STAR.md)).

## Canonical schema (this monorepo)

From this directory, the normative JSON Schema lives at:

```text
../../../spec/IR_BUNDLE.schema.json
```

Print the resolved absolute path:

```bash
npm run where-schema
```

## Publishing

`private: true` avoids accidental `npm publish` until generated types and versioning are wired. Remove `private` and add build steps (e.g. `json-schema-to-typescript`) when ready.
