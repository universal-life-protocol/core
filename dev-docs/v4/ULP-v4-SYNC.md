# ULP v4 Sync Protocol (ULP Sync v1)

This document defines a minimal, transport-agnostic collaboration protocol
for intent traces. It is append-only, idempotent, and deterministic.

## 1. Goals

- Append-only intent traces
- Idempotent delivery
- Offline-first synchronization
- No global ordering requirement
- Deterministic replay

## 2. Trace envelope (authoritative payload)

```json
{
  "v": 4,
  "id": "ulp:v4:<hash>",
  "ts": 0,
  "kind": "intent",
  "template": "blackboard.node.v1",
  "author": "optional-key-or-null",
  "payload": {
    "intentVersion": 1,
    "intent": {
      "type": "NODE_CREATE",
      "nodeId": "..."
    }
  },
  "refs": ["ulp:ref:node:..."],
  "sig": "optional"
}
```

## 3. Message types

- `HELLO`: announce peer capabilities + last seen id
- `HAVE`: advertise known ids (or Bloom filter)
- `WANT`: request missing ids
- `PUSH`: send intent trace payload
- `ACK`: confirm receipt (optional)

## 4. Ordering rules

- Projections must not assume a global order.
- If ordering is needed, sort by `(ts, id)`.
- If `ts` is missing or 0, sort by `id` only.

## 5. Dedupe rules

- Store traces by `id` (content-addressed).
- If `id` exists, drop silently.

## 6. Conflict handling

- Default: last-write-wins by `(ts, id)` within projection reducers.
- Ties break on `id` (byte order).
- Conflicts are surfaced in views, never by mutation.

## 7. Sync algorithm (minimal)

1. Peer A sends `HELLO` + `HAVE`.
2. Peer B replies with `WANT` for missing ids.
3. Peer A sends `PUSH` messages.
4. Peer B acknowledges with `ACK` (optional).
5. Both replay deterministically.

## 7.1 Example flow (text)

```
A -> B: HELLO { lastSeen: "ulp:v4:aaa..." }
A -> B: HAVE { ids: ["ulp:v4:aaa...", "ulp:v4:bbb..."] }
B -> A: WANT { ids: ["ulp:v4:bbb..."] }
A -> B: PUSH { trace: { id: "ulp:v4:bbb...", ... } }
B -> A: ACK  { ids: ["ulp:v4:bbb..."] }
```

## 8. Security

- Verify `sig` if present; reject invalid signatures.
- `.symmetry` and Δ are enforced locally by the projection.

## 9. Transport notes (optional)

### 9.1 Bloom filter example

```
{
  "type": "HAVE",
  "bloom": {
    "k": 4,
    "m": 2048,
    "bits": "AAECAwQFBgcICQoLDA0ODw=="
  }
}
```

### 9.2 Retry/backoff

- If `WANT` is unanswered, retry with exponential backoff.
- If `PUSH` fails, keep the trace in a resend queue.
## 9. Message schemas (JSON)

### 9.1 HELLO

```json
{
  "type": "HELLO",
  "peer": "optional-peer-id",
  "caps": {
    "bloom": true,
    "sig": true
  },
  "lastSeen": "ulp:v4:<hash>"
}
```

### 9.2 HAVE (list)

```json
{
  "type": "HAVE",
  "ids": ["ulp:v4:<hash>", "..."]
}
```

### 9.3 HAVE (bloom)

```json
{
  "type": "HAVE",
  "bloom": {
    "k": 4,
    "m": 2048,
    "bits": "base64..."
  }
}
```

### 9.4 WANT

```json
{
  "type": "WANT",
  "ids": ["ulp:v4:<hash>", "..."]
}
```

### 9.5 PUSH

```json
{
  "type": "PUSH",
  "trace": {
    "v": 4,
    "id": "ulp:v4:<hash>",
    "ts": 0,
    "kind": "intent",
    "template": "blackboard.node.v1",
    "author": "optional-key-or-null",
    "payload": {
      "intentVersion": 1,
      "intent": { "type": "NODE_CREATE", "nodeId": "..." }
    },
    "refs": ["ulp:ref:node:..."],
    "sig": "optional"
  }
}
```

### 9.6 ACK

```json
{
  "type": "ACK",
  "ids": ["ulp:v4:<hash>", "..."]
}
```
