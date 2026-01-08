# ULP v4 Projection Layer (Index)

This directory captures the v4 projection layer as an additive spec on top of
v1.1–v3.0. It does not replace the execution algebra; it formalizes how traces
become stable, deterministic views.

## Core documents

- `dev-docs/v4/ULP-v4-DELTA.md`
  - Defines Δ, the computable semantic distance used by `.symmetry`.
- `dev-docs/v4/ULP-v4-SYMMETRY.md`
  - Defines the `.symmetry` grammar and semantics for meaning preservation.
- `dev-docs/v4/ULP-v4-RENDERER-CONTRACT.md`
  - Renderer contract for deterministic projection (SVG/HTML/Canvas/TUI).
- `dev-docs/v4/ULP-v4-UPGRADE-PROPOSAL.md`
  - Upgrade path from v1.1–v3.0 to the v4 projection layer.
- `dev-docs/v4/ULP-v4-ADAPTER-SPEC.md`
  - Read-only adapter contract for v3 -> v4 projections.
- `dev-docs/v4/ULP-v4-VIEW-STUB.md`
  - Minimal `.view` grammar stub for renderer compliance.
- `dev-docs/v4/ULP-v4-RENDERER-TESTS.md`
  - Minimal renderer compliance tests (deterministic node/edge sets).
- `dev-docs/v4/ULP-v4-SYNC.md`
  - Minimal collaboration protocol (ULP Sync v1).

## Relationship to v3

- v3 execution algebra remains authoritative.
- v4 adds an explicit projection layer: `.symmetry` + Δ + renderer contract.
- v4 is additive: adapters read v1.1/v2.0/v3.0 traces and emit v4 projections.

## Minimal flow

```
.trace
  -> canonical entries (Δ core)
  -> symmetry-admissible transforms
  -> .view layout intent
  -> renderer output
```
