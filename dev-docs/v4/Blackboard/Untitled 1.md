Great — I’ll do this **precisely and systemically**, assuming:

* **event-sourced / trace-based**
* **decentralized**
* **canvas is a projection**
* **no hidden mutations**
* **intents are the UI contract**

I’ll give you:

1. A **complete intent taxonomy** (you can trim later)
2. A **projection reducer** that turns traces → visual model
3. Notes on **conflict safety & determinism**

---

# 1. Full Intent Taxonomy (UI → Domain boundary)

This taxonomy is **editor-complete** but still minimal.
Every canvas interaction maps to *exactly one* of these.

---

## 1.1 Lifecycle & structure intents

### Create

```ts
type CreateNodeIntent = {
  type: "NODE_CREATE"
  nodeId: string
  nodeType: "note" | "frame" | "group" | "embed"
  at: Point
  initialBounds?: Rect
  metadata?: any
}
```

### Delete

```ts
type DeleteNodeIntent = {
  type: "NODE_DELETE"
  nodeId: string
}
```

### Duplicate

```ts
type DuplicateNodeIntent = {
  type: "NODE_DUPLICATE"
  sourceId: string
  newNodeId: string
  offset: Point
}
```

---

## 1.2 Geometry intents (pure spatial)

These should be **frequent, composable, replayable**.

### Move

```ts
type MoveNodeIntent = {
  type: "NODE_MOVE"
  nodeId: string
  to: Point
}
```

### Resize

```ts
type ResizeNodeIntent = {
  type: "NODE_RESIZE"
  nodeId: string
  bounds: Rect
}
```

### Set z-order

```ts
type ReorderNodeIntent = {
  type: "NODE_REORDER"
  nodeId: string
  zIndex: number
}
```

---

## 1.3 Content intents (semantic)

### Edit content

```ts
type EditContentIntent = {
  type: "NODE_EDIT_CONTENT"
  nodeId: string
  content: string
}
```

### Patch metadata

```ts
type PatchMetadataIntent = {
  type: "NODE_PATCH_METADATA"
  nodeId: string
  patch: Partial<any>
}
```

> ⚠️ Never overwrite metadata wholesale in decentralized systems.

---

## 1.4 Relationship intents (graph semantics)

### Connect nodes

```ts
type ConnectNodesIntent = {
  type: "EDGE_CREATE"
  edgeId: string
  from: string
  to: string
  metadata?: any
}
```

### Delete edge

```ts
type DeleteEdgeIntent = {
  type: "EDGE_DELETE"
  edgeId: string
}
```

---

## 1.5 Grouping & hierarchy

### Group

```ts
type GroupNodesIntent = {
  type: "GROUP_CREATE"
  groupId: string
  children: string[]
}
```

### Ungroup

```ts
type UngroupNodesIntent = {
  type: "GROUP_DELETE"
  groupId: string
}
```

---

## 1.6 Visibility & locking (important for conflicts)

```ts
type LockNodeIntent = {
  type: "NODE_LOCK"
  nodeId: string
}

type UnlockNodeIntent = {
  type: "NODE_UNLOCK"
  nodeId: string
}

type SetVisibilityIntent = {
  type: "NODE_SET_VISIBILITY"
  nodeId: string
  visible: boolean
}
```

---

## 1.7 Layout & automation (optional but powerful)

```ts
type AutoLayoutIntent = {
  type: "LAYOUT_APPLY"
  nodeIds: string[]
  algorithm: "grid" | "force" | "tree"
}
```

---

## 1.8 Meta / time intents (decentralized superpowers)

### Soft conflict marker

```ts
type MarkConflictIntent = {
  type: "NODE_MARK_CONFLICT"
  nodeId: string
  reason: string
}
```

### Attribution (optional)

```ts
type AnnotateIntent = {
  type: "INTENT_ANNOTATE"
  targetId: string
  note: string
}
```

---

## 1.9 The union

```ts
type Intent =
  | CreateNodeIntent
  | DeleteNodeIntent
  | DuplicateNodeIntent
  | MoveNodeIntent
  | ResizeNodeIntent
  | ReorderNodeIntent
  | EditContentIntent
  | PatchMetadataIntent
  | ConnectNodesIntent
  | DeleteEdgeIntent
  | GroupNodesIntent
  | UngroupNodesIntent
  | LockNodeIntent
  | UnlockNodeIntent
  | SetVisibilityIntent
  | AutoLayoutIntent
  | MarkConflictIntent
  | AnnotateIntent
```

This is enough to build **Excalidraw / tldraw / Obsidian Canvas** class editors.

---

# 2. Projection Reducer (Trace → Visual Model)

This reducer:

* Is **pure**
* Is **deterministic**
* Is **order-sensitive but replayable**
* Can be made CRDT-friendly later

---

## 2.1 Visual model

```ts
type VisualState = {
  nodes: Map<string, VisualNode>
  edges: Map<string, VisualEdge>
  groups: Map<string, Group>
}
```

---

## 2.2 Base reducer structure

```ts
function project(
  state: VisualState,
  intent: Intent
): VisualState {
  switch (intent.type) {
    case "NODE_CREATE":
      return createNode(state, intent)

    case "NODE_MOVE":
      return moveNode(state, intent)

    case "NODE_RESIZE":
      return resizeNode(state, intent)

    case "NODE_EDIT_CONTENT":
      return editContent(state, intent)

    case "NODE_DELETE":
      return deleteNode(state, intent)

    case "EDGE_CREATE":
      return createEdge(state, intent)

    case "EDGE_DELETE":
      return deleteEdge(state, intent)

    case "GROUP_CREATE":
      return createGroup(state, intent)

    case "GROUP_DELETE":
      return deleteGroup(state, intent)

    default:
      return state
  }
}
```

---

## 2.3 Concrete reducer examples

### Create node

```ts
function createNode(
  state: VisualState,
  intent: CreateNodeIntent
): VisualState {
  if (state.nodes.has(intent.nodeId)) return state

  const node: VisualNode = {
    id: intent.nodeId,
    type: intent.nodeType,
    bounds: {
      x: intent.at.x,
      y: intent.at.y,
      width: intent.initialBounds?.width ?? 200,
      height: intent.initialBounds?.height ?? 120
    },
    zIndex: state.nodes.size,
    content: "",
    metadata: intent.metadata ?? {},
    locked: false,
    visible: true
  }

  return {
    ...state,
    nodes: new Map(state.nodes).set(node.id, node)
  }
}
```

---

### Move node (last-write-wins friendly)

```ts
function moveNode(
  state: VisualState,
  intent: MoveNodeIntent
): VisualState {
  const node = state.nodes.get(intent.nodeId)
  if (!node || node.locked) return state

  const updated = {
    ...node,
    bounds: {
      ...node.bounds,
      x: intent.to.x,
      y: intent.to.y
    }
  }

  return {
    ...state,
    nodes: new Map(state.nodes).set(node.id, updated)
  }
}
```

---

### Resize node

```ts
function resizeNode(
  state: VisualState,
  intent: ResizeNodeIntent
): VisualState {
  const node = state.nodes.get(intent.nodeId)
  if (!node || node.locked) return state

  return {
    ...state,
    nodes: new Map(state.nodes).set(intent.nodeId, {
      ...node,
      bounds: intent.bounds
    })
  }
}
```

---

### Edit content

```ts
function editContent(
  state: VisualState,
  intent: EditContentIntent
): VisualState {
  const node = state.nodes.get(intent.nodeId)
  if (!node) return state

  return {
    ...state,
    nodes: new Map(state.nodes).set(intent.nodeId, {
      ...node,
      content: intent.content
    })
  }
}
```

---

### Delete node (cascade-safe)

```ts
function deleteNode(
  state: VisualState,
  intent: DeleteNodeIntent
): VisualState {
  if (!state.nodes.has(intent.nodeId)) return state

  const nodes = new Map(state.nodes)
  nodes.delete(intent.nodeId)

  const edges = new Map(
    [...state.edges].filter(
      ([_, e]) => e.from !== intent.nodeId && e.to !== intent.nodeId
    )
  )

  return { ...state, nodes, edges }
}
```

---

## 2.4 Replay engine

```ts
function replay(
  intents: Intent[]
): VisualState {
  return intents.reduce(project, {
    nodes: new Map(),
    edges: new Map(),
    groups: new Map()
  })
}
```

This:

* Enables **time travel**
* Enables **conflict inspection**
* Enables **offline merge**

---

# 3. Determinism & decentralization notes (important)

To keep this safe across peers:

### ✅ Do

* Use stable IDs (UUIDv7 / hash-based)
* Keep intents small
* Prefer **absolute state** (`to`, not `delta`)
* Make reducers idempotent

### ❌ Avoid

* Frame-based deltas
* UI-specific fields
* Implicit ordering assumptions

---

# 4. Why this works with Excalidraw / tldraw

* Excalidraw intents ≈ subset of this
* tldraw store events ≈ normalized version of this
* Your trace log becomes the **interchange layer**
* Canvas engines become replaceable

---

## If you want next

I can:

* Add **CRDT-aware variants** of move/resize
* Define **selection & hover as derived state**
* Show **conflict visualization reducers**
* Map this 1:1 onto Excalidraw scene JSON
* Show how to compress high-frequency intents

Just tell me where you want to go deeper.
