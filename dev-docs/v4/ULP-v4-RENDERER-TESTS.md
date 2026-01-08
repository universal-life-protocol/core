# ULP v4 Renderer Compliance Tests (Minimal)

This document defines minimal, deterministic tests for renderer compliance
against the v4 renderer contract. These tests validate node/edge identity and
Δ-bounded projection behavior, not visual styling.

## 1. Test inputs

All tests assume:

- `.trace` is fixed and canonical
- `.symmetry` is fixed and valid
- `.view` is fixed and valid

## 2. Required tests

### 2.1 Deterministic node set

Given identical inputs, the renderer MUST produce identical node ids.

Test:

- Render twice.
- Extract node ids.
- Compare sets (byte-equality).

Pass condition:

- Node id sets are identical.

### 2.2 Deterministic edge set

Given identical inputs, the renderer MUST produce identical edge pairs.

Test:

- Render twice.
- Extract edge pairs `(from, to)`.
- Compare sets (byte-equality).

Pass condition:

- Edge sets are identical.

### 2.3 Quadrant coverage

Renderer MUST expose all four quadrants as semantic regions.

Test:

- Render once.
- Verify that quadrant labels `KK`, `KU`, `UK`, `UU` are present in the
  render model or view metadata.

Pass condition:

- All four quadrants are present.

### 2.4 UU portal interactivity

UU must be interactive and not treated as content.

Test:

- Trigger the UU portal affordance.
- Ensure the renderer emits `open_portal(UU)` (or equivalent intent).

Pass condition:

- An intent is emitted without changing the trace.

### 2.5 Explainability

Renderer MUST provide an explain view for any node.

Test:

- Select a node id.
- Request explain.
- Verify explain payload includes:
  - canonical hash
  - quadrant
  - Δ-related neighbors
  - refs or symmetry reason

Pass condition:

- All fields are present.

### 2.6 Shadow canvas determinism

Shadow canvases must be derived only via `.symmetry`-allowed transforms.

Test:

- Request a shadow canvas using an allowed transform.
- Ensure node/edge sets match the projected trace.

Pass condition:

- Shadow node/edge sets match the deterministic projection.

## 3. Optional tests

### 3.1 View-layout independence

Different `.view` layout hints MUST NOT change node/edge identity.

Test:

- Render with two different `.view` layout intents.
- Compare node/edge sets.

Pass condition:

- Node/edge sets identical.

### 3.2 Idempotent intent emission

Repeated selection of a node MUST NOT produce new trace entries.

Test:

- Click node N multiple times.
- Confirm no trace writes occurred.

Pass condition:

- Trace remains unchanged.
