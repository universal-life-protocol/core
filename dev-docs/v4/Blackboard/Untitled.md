Perfect — that constraint actually simplifies things a lot.

You **already have**:

* a domain model
* a trace / event logging system
* the ability to do canvas transforms (pan / zoom)

You **only need a presentation + interaction model** for a **decentralized whiteboard**.

Below is a **clean, minimal, scalable architecture** that assumes:

* event-sourced / trace-driven state
* no central server assumptions
* canvas is a *projection* of logs
* portability > visual novelty

I’ll stay concrete and systematic.

---

## 1. Core mental model (this is the foundation)

Think in **three layers only**:

```
Trace Log (source of truth)
        ↓
Projection Engine (deterministic)
        ↓
Canvas Presentation Model (UI-only)
```

The canvas:

* never owns truth
* never mutates state directly
* emits **intents**
* re-renders from projections

This is the right model for decentralized systems.

---

## 2. Interfaces (what you actually need)

You need **four interfaces**, not a framework.

---

## 3. Interface #1: Viewport / Camera

This is the only continuous state.

```ts
interface Camera {
  x: number        // world offset
  y: number
  zoom: number
  rotation?: number
}
```

Operations:

* `pan(dx, dy)`
* `zoomAt(point, factor)`
* `fit(bounds)`
* `screenToWorld(pt)`
* `worldToScreen(pt)`

**Rules**

* Camera state is NOT logged
* Camera state is per-user
* Camera state never affects domain logic

---

## 4. Interface #2: Visual Node Model (projection)

This is the **read-only canvas graph**.

```ts
interface VisualNode {
  id: string
  type: "note" | "edge" | "group" | "frame"
  bounds: Rect
  zIndex: number
  style: Style
  content?: string
  metadata?: any
}
```

Key constraints:

* Derived from trace log
* Immutable per frame
* Stable IDs
* No UI-only fields inside

This is where Excalidraw or tldraw *would* sit — but you’re abstracting it.

---

## 5. Interface #3: Interaction → Intent layer (most important)

UI **never mutates nodes**.

Instead, it emits **intents**:

```ts
type Intent =
  | { type: "CREATE_NODE"; at: Point }
  | { type: "MOVE_NODE"; id: string; to: Point }
  | { type: "RESIZE_NODE"; id: string; bounds: Rect }
  | { type: "EDIT_CONTENT"; id: string; content: string }
  | { type: "CONNECT_NODES"; from: string; to: string }
  | { type: "DELETE_NODE"; id: string }
```

Intents:

* Are local
* Are ephemeral
* Are converted into trace events
* Can be rejected / transformed

This keeps decentralization sane.

---

## 6. Interface #4: Interaction State Machine

You need **tools**, not callbacks.

```ts
interface Tool {
  onPointerDown(e)
  onPointerMove(e)
  onPointerUp(e)
  onKeyDown(e)
  onCancel()
}
```

Examples:

* `PanTool`
* `SelectTool`
* `CreateNodeTool`
* `ConnectTool`
* `EditTool`

Each tool:

* Reads visual projection
* Emits intents
* Owns transient state only

This avoids cross-tool bugs.

---

## 7. Core interactions you actually need (complete list)

Here is the **minimal but complete** interaction surface for a decentralized whiteboard.

### Navigation

* Pan
* Zoom (wheel + pinch)
* Zoom to fit
* Reset view

---

### Selection

* Click select
* Shift multi-select
* Box select
* Clear selection

Selection state:

```ts
Set<NodeID>
```

(Local only, never logged)

---

### Manipulation

* Drag node
* Resize node
* Move group
* Nudge via keyboard
* Duplicate

All emit intents → traces.

---

### Creation

* Create node at point
* Create node from selection
* Create connection
* Auto-layout (optional)

---

### Editing

* Double-click to edit
* Overlay editor (DOM)
* Commit → intent
* Cancel → no-op

---

### Structural

* Group / ungroup
* Bring to front / send back
* Lock / unlock

---

### Meta (critical for decentralized)

* Conflict resolution feedback
* Replay / time-travel scrub
* Attribution (who moved what)

---

## 8. Rendering pipeline (simple but robust)

Per frame:

```
trace log
  ↓ (projection)
visual nodes
  ↓ (culling)
visible nodes
  ↓ (camera transform)
draw
```

Rules:

* No mutation during render
* Culling before transform
* Deterministic ordering

---

## 9. Hit testing (don’t skip this)

You need:

* Spatial index (quadtree or grid)
* Hit test in world space
* Priority by zIndex + type

```ts
hitTest(worldPoint): VisualNode | null
```

This enables:

* Selection
* Hover
* Handles
* Context menus

---

## 10. Decentralization concerns (important)

Your system already has traces, so:

### Every intent becomes:

```ts
{ actor, timestamp, intent }
```

### Projection must be:

* Deterministic
* Commutative (if possible)
* Idempotent

Visual conflicts:

* Show ghost states
* Soft-locks, not hard locks
* Eventually consistent positions

Canvas editors fail here — you won’t.

---

## 11. What you do *not* need

You do **not** need:

* DOM-based layout engines
* Framework-specific state
* Live mutation of canvas objects
* Central authority

---

## 12. Minimal tech stack suggestion

Since you already can do transforms:

* Rendering: Canvas or WebGL
* Interaction: Pointer Events
* State: Your trace system
* Projection: Pure functions
* UI overlays: DOM

Libraries are optional.

---

## 13. Why this architecture works

* Canvas is stateless
* UI is replaceable
* Trace log is portable
* Offline-first by default
* Replay & audit are natural
* Multiple canvases can exist

This is **how decentralized editors should be built**, and it aligns with both Excalidraw *and* tldraw philosophies without inheriting their constraints.

---

## If you want next

I can:

* Define a **full intent taxonomy**
* Show a **projection reducer**
* Design **conflict visualization patterns**
* Map this onto Excalidraw or tldraw concretely
* Help you choose Canvas vs WebGL for this exact setup

Just tell me which layer you want to flesh out next.
