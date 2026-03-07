This assessment is implementation-first.
Production-docs must not overclaim beyond runnable code, tests, and stable docs.
Research and lineage docs remain valuable, but are not automatically active authority.

## 1. Repository purpose
`/home/main/devops/universal-life-protocol` is a multi-lineage repository centered on deterministic trace construction engines (strongest in `ulp-v3.0`), plus multiple app/runtime surfaces that mostly read, relay, or project traces rather than define protocol authority. It is not a single unified production runtime, not a single-version protocol deployment, and not a guarantee that all documented features are currently executable in-place without environment or permission fixes.

## 2. Current production reading
- Runnable core: `ulp-v3.0` and `ulp-v2.0` run and pass determinism tests in this workspace (`ulp-v3.0/test_conformance.sh`, `ulp-v2.0/test_determinism.sh`).
- Versioned lineage: `ulp-v1.1` (sealed architecture), `ulp-v2.0` (reference + policy layer), `ulp-v3.0` (formalized deterministic core), `ulp-v4.0` (read-only adapter/delta tools).
- Research/architecture: `dev-docs/` contains conceptual and design lineage; implementation weight varies and is often indirect.
- Archive: `archive/` contains historical implementations (`archive/ulp-v1.0`, `archive/ulp-v1.1/v2`) and build transcripts.
- Projection/demo: `docs/`, `docs/projections`, `apps/trace-chat`, and viewer/studio surfaces are primarily projection or interaction shells, not canonical truth engines.

## 3. Top-level subsystem inventory
| Subsystem | Path | Type | Actual status | Canonical role | Evidence |
|---|---|---|---|---|---|
| ULP v1.1 | `ulp-v1.1` | version-line | partial | historical sealed authority | `ulp-v1.1/bin/run.sh`, `ulp-v1.1/validate.sh`, non-executable scripts in `ulp-v1.1/bin/*` |
| ULP v2.0 | `ulp-v2.0` | version-line | active | reference deterministic engine | `ulp-v2.0/bin/run.sh`, `ulp-v2.0/test_determinism.sh` |
| ULP v3.0 | `ulp-v3.0` | version-line | active | strongest current deterministic line | `ulp-v3.0/bin/run.sh`, `ulp-v3.0/test_conformance.sh`, `ulp-v3.0/ULP-v3.0-SPEC.md` |
| ULP v4.0 | `ulp-v4.0` | version-line | partial | read-only projection/adapter line | `ulp-v4.0/bin/adapter.mjs`, `ulp-v4.0/bin/delta.mjs`, `ulp-v4.0/README.md` |
| Apps bundle | `apps` | tooling | active | runtime/application surfaces | `apps/*` |
| Blackboard Web | `apps/blackboard-web` | app | active | relay + feed projection surface | `src/app.ts`, `src/core/trace.ts`, `relay/server.mjs` |
| locals-only | `apps/locals-only` | app | prototype | local-first marketplace demo/runtime | `client/main.js`, `client/record.js`, `client/mqtt.js` |
| p2p-server (Go) | `apps/p2p-server` | server | partial | trace-serving transport surface | `server/main.go`, `server/test_smoke.sh` |
| p2p-server-node | `apps/p2p-server-node` | transport | active | trace-serving transport + projection API | `server.js`, `test_smoke.sh` |
| trace-chat | `apps/trace-chat` | demo | prototype | browser encrypted chat demo | `tracechat.js`, `index.html` |
| ulp-chat | `apps/ulp-chat` | app | partial | chat + ledger + view snapshots | `server.js`, `lib/ledger.js`, `lib/ulp.js` |
| ulp-sdk | `apps/ulp-sdk` | sdk | active | projection/schema helper for trace-derived records | `src/index.js` |
| ULP v1.1 MCP server | `apps/ulp-v1.1-mcp-server` | server | prototype | MCP scene control/reference surface | `index.js`, `README.md` |
| Web docs/projections | `docs` | projection | generated | public-facing projection outputs | `docs/README.md`, `docs/projections/*` |
| Dev docs | `dev-docs` | research | active | architecture/research lineage | `dev-docs/v1..v4`, `dev-docs/Architecture` |
| Archive | `archive` | archive | archive | historical reference only | `archive/ulp-v1.0`, `archive/ulp-v1.1/v2` |

## 4. Version-line assessment
### ULP v1.1
- Implemented components: POSIX/awk execution engine (`bin/run.sh`), validator (`validate.sh`), reconstruction (`bin/decode_trace.sh`), projection dispatcher (`bin/observe.sh`).
- Tests/gates: `validate.sh` exists but fails in this checkout at world validation; `run.sh` enforces executable `bin/hash.sh` and fails when mode bits are absent.
- Canonical docs/specs: `ulp-v1.1/README.md`, sealed architecture references under `dev-docs/ULP-v1.1-ARCHITECTURE.txt` and `dev-docs/ULP-v1.1-SEAL.md`.
- Actual runtime behavior: append-only trace construction and self-encoding are implemented in shell/awk, but current file-mode state makes runtime operationally partial.
- Changed from prior: [inferred] consolidates/extends v1.0 archived model into sealed v1.1 formal language.
- Remains authoritative from this version: five sealed invariants and trace-as-authority model.
- Not current authority: app/network claims located elsewhere should not be read as v1.1 core runtime authority.

### ULP v2.0
- Implemented components: shell/awk runner, canonicalization/hash, algebra, policy/geometry/replica derivation (`bin/run.sh`, `bin/canon.sh`, `bin/policy.sh`, `bin/geometry.sh`, `bin/replica.sh`).
- Tests/gates: deterministic test passes (`test_determinism.sh`).
- Canonical docs/specs: `ulp-v2.0/README.md`; spec lineage in `dev-docs/ULP-v2.0-SPECIFICATION.md`.
- Actual runtime behavior: deterministic trace generation with appended policy metadata and self-encoding bundle.
- Changed from prior: adds policy/geometry/replica derivation beyond v1.1 base trace law.
- Remains authoritative from this version: E8×E8-derived metadata flow as implemented in shell scripts.
- Not current authority: embedded/adjacent app examples are not equivalent to protocol core authority.

### ULP v3.0
- Implemented components: v2-like engine plus CPNF/canonical algebra tooling and view-model renderer (`bin/run.sh`, `bin/poly.awk`, `bin/canon.sh`, `bin/view_model.sh`).
- Tests/gates: conformance suite passes (`test_conformance.sh`, `test_cpnf.sh`, `test_trace_schema.sh`, `test_view_model.sh`, `test_determinism.sh`).
- Canonical docs/specs: `ULP-v3.0-SPEC.md`, `ULP-v3.0-GRAMMAR.md`, `ULP-v3.0-VIEW.md`.
- Actual runtime behavior: strongest deterministic, tested, append-only trace law in repo today.
- Changed from prior: formalized execution algebra and CPNF-centric canonicalization.
- Remains authoritative from this version: canonicalization + hashing + trace schema behavior with test evidence.
- Not current authority: UI/demo surfaces that consume v3 traces are not protocol law.

### ULP v4.0
- Implemented components: Node-based adapter/canonical core/delta calculators (`bin/adapter.mjs`, `bin/canon-core.mjs`, `bin/delta.mjs`).
- Tests/gates: no dedicated executable test suite found; basic adapter + self-delta run works.
- Canonical docs/specs: `ulp-v4.0/README.md`, plus v4 design docs in `dev-docs/v4/*`.
- Actual runtime behavior: read-only projection adaptation from traces to semantic-core JSONL and distance computation.
- Changed from prior: adds adapter/delta/view-stub layer, not a world execution engine.
- Remains authoritative from this version: adapter and delta tooling semantics only.
- Not current authority: must not be mistaken for replacement of v3 execution core.

## 5. App/runtime assessment
### blackboard-web
- Path: `apps/blackboard-web`
- Actually does: browser feed/client for v2-style trace envelopes, local IndexedDB store, MQTT/HTTP adapters, optional relay stream.
- Transport surfaces: MQTT over WS (`src/adapters/mqttAdapter.ts`), HTTP NDJSON relay (`src/adapters/httpAdapter.ts`, `relay/server.mjs`).
- Persistence surfaces: browser IndexedDB (`src/core/store.ts`), relay append-only NDJSON log (`relay/server.mjs`).
- Projection/UI role: feed projection and lightweight signature verification.
- Authority: advisory (relay explicitly says transport/cache only; client composes views).
- Maturity: partial.
- Evidence: `src/app.ts`, `src/core/trace.ts`, `relay/README.md`.

### locals-only
- Path: `apps/locals-only`
- Actually does: browser-only marketplace using local canonicalization/hash verification, MQTT pub/sub, template-based projections.
- Transport surfaces: MQTT broker via browser (`client/mqtt.js`).
- Persistence surfaces: IndexedDB + localStorage (`client/index.js`, template/session storage).
- Projection/UI role: template-driven rendering (`client/template.js`, `client/view.js`).
- Authority: advisory.
- Maturity: prototype.
- Evidence: `client/main.js`, `client/record.js`, `client/templateManager.js`.

### p2p-server
- Path: `apps/p2p-server`
- Actually does: Go libp2p WebRTC peer + HTTP API serving trace bytes by RID.
- Transport surfaces: libp2p WebRTC (`/ulp/2.0.0`) and HTTP (`/api/record/*`).
- Persistence surfaces: reads trace files from disk; in-memory record map.
- Projection/UI role: serves HTML UI and QR connection data.
- Authority: governed-runtime (serves traces but does not define protocol law).
- Maturity: partial.
- Evidence: `server/main.go`, `server/test_smoke.sh`, `server/webauthn.go`.

### p2p-server-node
- Path: `apps/p2p-server-node`
- Actually does: Node libp2p WebRTC server with HTTP endpoints and SDK-backed projection schema/html.
- Transport surfaces: libp2p WebRTC + HTTP (`server.js`).
- Persistence surfaces: reads trace files; in-memory map.
- Projection/UI role: `/api/projection/:rid` and schema endpoints.
- Authority: governed-runtime.
- Maturity: partial.
- Evidence: `server.js`, `test_smoke.sh`, `../ulp-sdk/src/index.js`.

### trace-chat
- Path: `apps/trace-chat`
- Actually does: browser encrypted chat client with MQTT rendezvous and WebRTC data channels.
- Transport surfaces: Paho MQTT topics + WebRTC peer/data channels.
- Persistence surfaces: localStorage for identity/contacts/messages.
- Projection/UI role: chat UI only.
- Authority: projection-only.
- Maturity: prototype.
- Evidence: `tracechat.js`, `index.html`.

### ulp-chat
- Path: `apps/ulp-chat`
- Actually does: Express chat server writing JSONL ledger, gating claims with awk algebra, generating view snapshots.
- Transport surfaces: HTTP API (`/chat`, `/views/*`, `/redact/*`), optional Ollama backend call.
- Persistence surfaces: `ledger/2026-01.jsonl`, files under `views/`.
- Projection/UI role: ledger/query/explain UI and view snapshots.
- Authority: advisory.
- Maturity: partial.
- Evidence: `server.js`, `lib/ledger.js`, `lib/ulp.js`, `lib/views.js`.

### ulp-sdk
- Path: `apps/ulp-sdk`
- Actually does: parse policy fields from trace bytes and generate deterministic HTML/JSON projection artifacts.
- Transport surfaces: none.
- Persistence surfaces: none.
- Projection/UI role: projection utility package.
- Authority: projection-only.
- Maturity: partial.
- Evidence: `src/index.js`.

### MCP server
- Path: `apps/ulp-v1.1-mcp-server`
- Actually does: stdio MCP tool server managing in-memory 3D scene objects and export/import JSON trace-like payloads.
- Transport surfaces: MCP stdio.
- Persistence surfaces: in-memory scene map only.
- Projection/UI role: scene editing/control bridge.
- Authority: reference-only.
- Maturity: prototype.
- Evidence: `index.js`, `README.md`.

## 6. Protocol / trace / canonicalization surfaces
- Canonicalization lives primarily in shell/awk for v2/v3 (`ulp-v2.0/bin/canon.sh`, `ulp-v3.0/bin/canon.sh`, `poly.awk`) and separately in JS for v4 semantic-core projections (`ulp-v4.0/bin/canon-core.mjs`) and app-level record envelopes (`apps/blackboard-web/src/core/canonical.ts`, `apps/locals-only/client/record.js`).
- Hashing lives in shell hash utilities for version lines (`bin/hash.sh`) and Node/browser crypto for apps/v4 (`crypto.createHash`, `crypto.subtle`).
- Trace/replay behavior lives in version-line run/reconstruct tools (`ulp-v1.1/bin/run.sh`, `ulp-v1.1/bin/decode_trace.sh`, `ulp-v2.0/bin/run.sh`, `ulp-v3.0/bin/run.sh`).
- Strongest deterministic trace law today: `ulp-v3.0` (conformance + determinism tests passed).
- Projection-only parts: `docs/projections`, `ulp-v4.0` adapter/delta outputs, SDK projection HTML/schema, viewer/studio UIs.

## 7. Projection surface assessment
- Generated HTML/AR/GLTF/SVG/OBJ outputs: `docs/projections/*` are derived artifacts, not authoritative protocol state (`docs/README.md`).
- blackboard-web views: derived feed projections with local filters and adapter transport.
- trace-chat: chat UI and encrypted transport client; not protocol authority.
- viewer/studio surfaces: `docs/studio.html`, `docs/viewer.html`, `docs/ar-experience.html` are demo/projection interfaces.
- Classification:
  - authoritative: none in this section.
  - derived: `docs/projections/*`, blackboard-web rendered feed, ulp-chat `views/*` snapshots.
  - demo-only: `docs/*` web pages, `apps/trace-chat`, conversation-series artifacts.
  - generated outputs: `docs/projections/*`, app snapshot files under `apps/ulp-chat/views`.

## 8. Research vs implementation boundary
- `dev-docs/` contributes historical rationale, architecture exploration, and version proposals (`dev-docs/Architecture`, `dev-docs/v1..v4`).
- Still conceptual/research: large portions of v1.5/v4 design docs and architecture essays without direct runnable counterparts.
- Implementation evidence exists where docs map to code paths in `ulp-v2.0`, `ulp-v3.0`, `ulp-v4.0/bin`, and selected apps.
- Treat as architecture lineage only when no direct executable/script/test evidence is present.

## 9. Archive boundary
- Historical reference: `archive/ulp-v1.0`, `archive/ulp-v1.1/v2`, `archive/build.sh`, historical run scripts.
- Duplicate lineage: archive contains earlier copies of run/hash/canon pipelines also present in active root lines.
- Not active: archive paths are not the canonical active runtime lines.
- Still useful: evidence for earlier behavior and migration history comparisons.

## 10. Canonization summary
What this repository canonizes:
- Deterministic, append-only trace construction with world dotfiles as authority, strongest in `ulp-v3.0` and still implemented in `ulp-v2.0`.
- Policy/geometry/replica derivation in v2/v3 runtime traces.
- Projection as non-authoritative derived surface.

What this repository does not canonize:
- A single merged runtime that unifies all versions/apps as one authority.
- Archive or dev-doc research text as automatic production truth.
- Projection UIs, generated artifacts, or chat app ledgers as protocol authority.

## 11. Production recommendation
Best current authority surface: `ulp-v3.0` core (`bin/run.sh`, conformance tests, v3 spec/grammar).
Best current runnable surface: `ulp-v3.0` + `ulp-v2.0` core runners; `apps/p2p-server-node` for operational transport serving.
Best current deterministic trace surface: `ulp-v3.0`.
Best current projection/demo surface: `docs/` + `apps/blackboard-web` + `apps/ulp-sdk`.
Highest-value cleanup target: duplicated app bundles under `apps/ulp-chat/{p2p-server,p2p-server-node,ulp-sdk}` vs top-level `apps/*`.
Highest-value consolidation target: single authoritative app runtime index and de-duplication of p2p/sdk copies.
Biggest danger of misreading this repo: treating demos/projections/dev-doc proposals as active protocol authority and treating unfinished v4 scope as replacement for v3 execution law.

Production truth today: multi-lineage repo with strongest tested authority in ulp-v3.0; apps are mostly advisory/transport/projection surfaces
Strongest version line: ulp-v3.0
Strongest deterministic trace line: ulp-v3.0
Strongest app/runtime surface: apps/p2p-server-node (for runnable transport serving)
Strongest projection/demo surface: docs/ + apps/blackboard-web + apps/ulp-sdk
Largest implementation gap: no single hardened authoritative runtime across version+app surfaces
Largest documentation gap: unclear authority boundaries between production-docs, dev-docs, apps, and archive
Most important next cleanup: remove or explicitly deprecate duplicated app subtrees under apps/ulp-chat
Most important next production-doc follow-up: add an evidence-index appendix mapping every authoritative claim to exact code/test paths
