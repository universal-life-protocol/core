# ULP v4 Renderer Contract (Normative)

Status: Normative
Applies to: `.view`, `.interface`, `.symmetry`, `.trace`
Scope: Rendering only (no execution, no authority)

## 1. Purpose

A renderer is a pure projection of a closed ULP system into a human-perceivable
space.

A renderer:

- MUST NOT modify truth
- MUST NOT invent information
- MAY reorder, group, hide, or emphasize information
- MUST be reversible up to semantic equivalence (Δ-bounded)

## 2. Inputs to the renderer

A compliant renderer MUST accept the following inputs.

### 2.1 Required inputs

- `.trace`: canonical trace (append-only, immutable)
- `.view`: layout + projection intent
- `.symmetry`: allowed transformations + Δ profile

### 2.2 Optional inputs

- `.interface`: interaction affordances
- `.record`: persisted view state (non-authoritative)

## 3. Renderer output

A renderer produces only projections:

- Visual elements (SVG, HTML, Canvas, text)
- Interaction affordances (click, select, hover)
- View-local state (scroll, zoom, collapse)

A renderer MUST NOT:

- Create trace entries directly
- Alter canonical ordering
- Suppress trace visibility permanently

## 4. Canonical projection model

### 4.1 Rendering pipeline (required)

```
.trace
  ↓ canon(e)
canonical entries
  ↓ symmetry-admissible transforms
projection set
  ↓ view layout intent
render tree
  ↓ renderer
visual output
```

## 5. Core renderer primitives

All renderers MUST support the following abstract primitives.

### 5.1 Node

A node represents a single trace entry.

Required fields:

```json
{
  "id": "hash",
  "kind": "EVENT | QUESTION | ASSERTION | STORY | META",
  "quadrant": "KK | KU | UK | UU",
  "payload": "opaque",
  "refs": ["hash", "..."]
}
```

A renderer:

- MUST display nodes as discrete units
- MAY choose any visual form (card, dot, glyph)

### 5.2 Edge

An edge represents a reference relationship.

Required semantics:

- Directional or bidirectional
- Derived solely from `.trace.refs`

A renderer:

- MUST NOT invent edges
- MAY hide or restyle edges per `.view`

### 5.3 Canvas

A canvas is a projection surface.

Types:

- `infinite`
- `bounded`
- `portal`

A renderer:

- MUST support infinite coordinate space
- MUST NOT treat coordinates as truth

## 6. Quadrant semantics (required)

Quadrants are semantic regions, not UI categories.

Quadrant meanings:

- KK: Stable, confirmed
- KU: Explicit uncertainty
- UK: Tacit / implicit
- UU: Entry portal

Renderer rules:

- MUST render all four quadrants
- MUST treat UU as interactive, not content
- MUST allow transitions only via new trace entries

## 7. Shadow canvases

A shadow canvas is a derived projection of the same trace.

Definition:

```
shadow = project(trace, transform)
```

Where `transform` is permitted by `.symmetry`.

A renderer:

- MAY display multiple canvases simultaneously
- MUST clearly indicate shadow context
- MUST allow return to primary canvas

## 8. Interaction contract

### 8.1 Allowed interactions

A renderer MAY emit intents, never mutations.

Allowed intents:

- `select(hash)`
- `focus(hash)`
- `open_portal(quadrant)`
- `request_explain(hash)`
- `propose_entry(payload)`

### 8.2 Intent handling

- Intents MUST be passed to the host application
- Only the host MAY create new trace entries
- Renderer remains stateless with respect to truth

## 9. Explainability requirement

A renderer MUST provide an explain view for any node.

Explain view MUST show:

- Canonical hash
- Quadrant
- Δ-related neighbors
- Why this node is here (refs + symmetry)

This MAY be a modal, panel, or overlay.

## 10. Determinism requirement

Given identical inputs:

- `.trace`
- `.view`
- `.symmetry`

A renderer MUST produce:

- Identical node sets
- Identical edge sets
- Identical quadrant assignments

Visual styling MAY differ.

## 11. Forbidden renderer behaviors

A renderer MUST NOT:

- Collapse UU into content
- Auto-promote KU -> KK
- Hide trace entries permanently
- Reorder trace causality
- Store private semantic state

## 12. Minimal compliance checklist

A renderer is ULP-v3 compliant if:

- Accepts `.trace`, `.view`, `.symmetry`
- Renders nodes + edges deterministically
- Supports infinite canvas
- Supports quadrants including UU portals
- Emits intents, not mutations
- Provides explainability
- Supports shadow canvases
- Preserves Δ-bounded equivalence

## 13. Mental model (one sentence)

A ULP renderer is a reversible lens over a closed semantic trace, never a
source of truth.
