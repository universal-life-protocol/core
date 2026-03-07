## 1. Purpose of This Document
This document is the single operating picture of the repository at `/home/main/devops/universal-life-protocol`. It separates protocol kernels from application shells, separates trace authority from projections, identifies where networking is actually implemented, and states where determinism is enforced.

## 2. System Overview (One Paragraph)
ULP in this repository is a deterministic trace construction system with multiple kernel version lines (`ulp-v1.1` to `ulp-v4.0`), surrounding transport/runtime app surfaces (`apps/p2p-server*`, `apps/blackboard-web`, `apps/locals-only`, `apps/ulp-chat`), and projection/UI surfaces (`docs/*`, SDK HTML/schema renderers). Kernel execution authority is strongest in `ulp-v3.0`; apps and transports move, cache, or present traces but do not redefine kernel truth.

## 3. The Four System Layers
### Layer 1 — Kernel (Trace Authority)
- Purpose: define deterministic execution law and canonical trace generation.
- Responsibilities: world canonicalization, hashing, execution, append-only trace records, determinism validation.
- Components: `ulp-v1.1`, `ulp-v2.0`, `ulp-v3.0`.
- Authority level: authoritative (with `ulp-v3.0` strongest currently).

### Layer 2 — Adapter / Semantic Tools
- Purpose: transform or compare traces without executing worlds.
- Responsibilities: semantic-core adaptation, canonical JSONL for comparison, delta computation.
- Components: `ulp-v4.0/bin/adapter.mjs`, `ulp-v4.0/bin/canon-core.mjs`, `ulp-v4.0/bin/delta.mjs`.
- Authority level: advisory for adaptation semantics; non-authoritative for kernel execution law.

### Layer 3 — Transport / Runtime Surfaces
- Purpose: move traces and expose runtime APIs/feeds.
- Responsibilities: relay, peer serving, stream endpoints, client runtime state.
- Components: `apps/p2p-server`, `apps/p2p-server-node`, `apps/blackboard-web/relay`, MQTT/HTTP/WebRTC clients.
- Authority level: governed-runtime/advisory; transport does not define protocol truth.

### Layer 4 — Projection / User Interfaces
- Purpose: render trace-derived views and user interactions.
- Responsibilities: feed rendering, dashboards, HTML/schema projections, studio/viewer pages.
- Components: `docs/projections`, `docs/studio.html`, `docs/viewer.html`, `apps/ulp-sdk`, app UIs.
- Authority level: projection-only.

## 4. Kernel Layer (Protocol Authority)
| Version | Role | Execution engine? | Tests? | Authority level |
|---|---|---|---|---|
| `ulp-v1.1` | sealed architectural ancestor | yes (`bin/run.sh`) | partial (`validate.sh` exists; fails in current checkout) | historical anchor |
| `ulp-v2.0` | bridge with policy/geometry/replica derivation | yes (`bin/run.sh`) | yes (`test_determinism.sh` passes) | supporting authority |
| `ulp-v3.0` | strongest deterministic/spec/runtime line | yes (`bin/run.sh`) | yes (`test_conformance.sh` and test suite pass) | primary authority |
| `ulp-v4.0` | read-only adapter/projection line | no (no world execution engine) | partial (no dedicated `test_*.sh` suite found) | adapter layer |

Evidence paths:
- `ulp-v3.0/bin/run.sh`, `ulp-v3.0/test_conformance.sh`, `ulp-v3.0/ULP-v3.0-GRAMMAR.md`
- `ulp-v2.0/bin/run.sh`, `ulp-v2.0/test_determinism.sh`
- `ulp-v1.1/bin/run.sh`, `ulp-v1.1/validate.sh`
- `ulp-v4.0/bin/adapter.mjs`, `ulp-v4.0/README.md`

Implementation-grounded reading:
- `v3` is strongest execution law.
- `v1.1` is the sealed architectural anchor.
- `v2` is the policy/geometry bridge.
- `v4` is an adapter layer, not kernel replacement.

## 5. Adapter Layer
Adapter tooling exists primarily in `ulp-v4.0`:
- `bin/adapter.mjs`: adapts trace records to v4 semantic-core entries.
- `bin/canon-core.mjs`: canonicalizes semantic entries and emits hashes.
- `bin/delta.mjs`: computes weighted delta between canonicalized traces.

This layer adapts traces, computes deltas, and produces semantic-core/projection artifacts. It does not execute worlds, mutate source traces, or replace kernel execution authority.

## 6. Transport and Runtime Surfaces
Implemented transport/runtime locations:
- `apps/p2p-server` (Go): libp2p WebRTC + HTTP APIs for RID-addressed record serving.
- `apps/p2p-server-node` (Node): libp2p WebRTC + HTTP + projection endpoints.
- `apps/blackboard-web/relay/server.mjs`: HTTP NDJSON relay/cache.

Observed transport mechanisms:
- HTTP NDJSON stream (`/traces/stream`) and POST ingestion in blackboard relay.
- MQTT in blackboard client and locals-only client paths.
- libp2p WebRTC in p2p servers.

Authority boundary:
- Transport moves traces; it does not define protocol truth.
- Relay explicitly states transport/cache role and non-authority (`apps/blackboard-web/relay/README.md`).

## 7. Application Surfaces
| App | Purpose | Transport | Writes trace? | Reads trace? | Projection-only? |
|---|---|---|---|---|---|
| `apps/blackboard-web` | feed/runtime client + relay integration | MQTT, HTTP | yes (v2 envelope records) | yes | no |
| `apps/locals-only` | local-first marketplace runtime | MQTT | yes (local records) | yes | no |
| `apps/ulp-chat` | chat + ledger + explain/views APIs | HTTP, [inferred] Ollama HTTP | yes (JSONL ledger events) | yes | no |
| `apps/trace-chat` | encrypted browser chat demo | MQTT rendezvous, WebRTC | yes (local chat/session state) | yes | no |
| `apps/ulp-sdk` | trace-derived projection helper | none | no | yes | yes |

Maintainer interpretation:
- These are runtime shells and interaction surfaces.
- They are not protocol authority by default.

## 8. Projection Surfaces
Primary projection surfaces:
- `docs/projections/*` (svg/gltf/ar outputs)
- `docs/viewer.html`, `docs/studio.html`, `docs/ar-experience.html`
- SDK-rendered outputs from `apps/ulp-sdk/src/index.js`

Invariant to preserve:
- projection = pure function(trace) (kernel principle)
- projections are derived outputs, not canonical truth state.

## 9. End-to-End Data Flow
1. World definition is provided via dotfiles (`ulp-v*/world/*`).
2. Execution engine runs (`ulp-v2.0/bin/run.sh` or `ulp-v3.0/bin/run.sh`).
3. Deterministic trace is generated (`out*/trace.log`) with canonicalization + hashing.
4. Trace is transported by app/runtime surfaces (HTTP/MQTT/WebRTC via `apps/*`).
5. Projection layers render trace-derived views (`docs/*`, SDK/app UIs).
6. Application interaction reads/writes app-level runtime data (feeds, ledgers, UI state).

Verification points:
- Kernel determinism tests: `ulp-v2.0/test_determinism.sh`, `ulp-v3.0/test_conformance.sh`.
- RID/hash checks in p2p smoke tests: `apps/p2p-server*/test_smoke.sh`.
- Relay validation at envelope level in `apps/blackboard-web/relay/server.mjs` (not full kernel validation).

## 10. Maintainer Mental Model
ULP is not an application framework. ULP is a deterministic trace engine. Apps and transports exist around trace authority.

```text
             ┌─────────────────────┐
             │      ULP Kernel     │
             │ deterministic trace │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │     Adapter Tools   │
             │   canonicalization  │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  Transport Servers  │
             │  p2p / mqtt / http  │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │        Apps         │
             │ chat / viewer / ui  │
             └─────────────────────┘
```

## 11. Common Misreadings
- Mistaking apps for protocol authority.
- Assuming `v4` replaces `v3` kernel execution law.
- Treating projection outputs as canonical truth state.
- Treating transport caches/feeds as equivalent to kernel trace law.

## 12. Final Operating Summary
Protocol authority lives in kernel version lines.
Trace determinism is enforced by the execution engine.
Transport is external.
Applications are projections and interaction shells.
