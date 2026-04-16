# Diagrams

Torqa is easier to grasp visually: one pipeline from text to checks, a clear **in-repo / out-of-repo** boundary, and how a single contract differs from ad-hoc formats.

---

## Diagram 1 — Core flow

End-to-end path from any workflow source to a handoff **outside** this repository.

```mermaid
flowchart TD
  A[Human / AI / imported workflow]
  B["`.tq` or equivalent input"]
  C[Parser]
  D[Canonical bundle — `ir_goal`]
  E[Structural validation — `validate_ir`]
  F[Semantic validation — registry + logic]
  G[External runtime — yours]

  A --> B
  B --> C
  C --> D
  D --> E
  E --> F
  F --> G
```

Execution happens only at **G**; everything above is specification and verification in the Torqa core.

---

## Diagram 2 — Repository layers

What lives **in this Git repository** versus what you run **elsewhere**.

```mermaid
flowchart TB
  subgraph OUT["Outside this repository"]
    direction TB
    U[Your `.tq` files and generators]
    X[External executors, queues, APIs]
  end

  subgraph REPO["Inside this repository"]
    direction TB
    S[Authoring surface — `.tq` rules documented + parser]
    P[Core parser — `src/surface`]
    I[IR model — `src/ir`, bundle JSON Schema]
    V[Validators — structural + semantic — `src/semantics`]
    D[Docs, tests, `spec/`]
  end

  U --> P
  V --> X
```

**In-repo:** parser, canonical IR types, validators, schema, tests, documentation.  
**Out-of-repo:** where files are authored at scale, and anything that **runs** workflows.

---

## Diagram 3 — Why Torqa matters

Contrast at a glance: many informal paths vs one contract and checks.

```mermaid
flowchart LR
  subgraph WO["Without Torqa"]
    direction TB
    WO1[Many formats]
    WO2[Inconsistent validation]
    WO3[Runtime risk]
    WO1 --> WO2 --> WO3
  end

  subgraph WI["With Torqa"]
    direction TB
    WI1[One contract — canonical IR]
    WI2[Deterministic checks]
    WI3[Portable spec]
    WI1 --> WI2 --> WI3
  end
```

Torqa does not remove all runtime risk; it **front-loads** spec risk into **repeatable** parse and validation.

---

## Diagram 4 — Future growth

**Possible** directions around the core—not commitments, not a shipped roadmap.

```mermaid
flowchart TB
  CORE[Current core — parse, IR, validate]
  A1[Richer authoring — versioned `.tq`]
  A2[Importers from other tools]
  A3[Lint, CI helpers, interop tooling]
  A4[Multi-runtime ecosystem consuming same IR]

  CORE --> A1 --> A2 --> A3 --> A4
```

Each step depends on maintainers, users, and scope. See [Roadmap](roadmap.md) and [Language evolution](language-evolution.md) for grounded notes—**not** promises of features or dates.
