## 1. Purpose of this map
This map distinguishes implemented version-line authority from aspirational or derivative material. It documents where authority shifted across `ulp-v1.1`, `ulp-v2.0`, `ulp-v3.0`, and `ulp-v4.0`, and separates protocol kernels from app/runtime/projection shells.

## 2. Version-line overview
| Version | Primary contribution | Strongest implemented surface | Weakest/unfinished surface | Current constitutional value | Status |
|---|---|---|---|---|---|
| ULP v1.1 | Sealed base trace calculus and reconstruction/projection heritage | `bin/run.sh` + `bin/decode_trace.sh` + projection dispatcher (`bin/observe.sh`) | Operational packaging in this checkout is partial (non-executable core scripts) | Historical constitutional anchor for sealed invariants and trace-as-authority | superseded-in-part |
| ULP v2.0 | Bridge layer adding policy/geometry/replica derivation on deterministic trace core | `bin/run.sh` policy metadata pipeline + `test_determinism.sh` | Network scope is split into apps, not hardened in version dir | Transitional constitutional bridge between sealed core and formalized v3 algebra | superseded-in-part |
| ULP v3.0 | Formalized deterministic core with CPNF, algebra admissibility, conformance suite | `bin/run.sh` + `bin/poly.awk` + passing conformance tests | Network transport remains app-level rather than in-core | Current live constitutional center for deterministic execution law | active |
| ULP v4.0 | Read-only semantic-core adapter/canonicalization/delta layer | `bin/adapter.mjs`, `bin/canon-core.mjs`, `bin/delta.mjs` | No execution engine; no dedicated full test suite found | Adapter/projection constitutional extension, not kernel replacement | adapter-stub |

## 3. Constitutional surfaces across versions
| Surface | v1.1 | v2.0 | v3.0 | v4.0 | Current strongest authority |
|---|---|---|---|---|---|
| canonicalization | yes | yes | yes | yes | v3.0 |
| hashing | yes | yes | yes | yes | v3.0 |
| replay / determinism | partial | yes | yes | no | v3.0 |
| grammar/spec | partial | partial | yes | partial | v3.0 |
| execution model | yes | yes | yes | no | v3.0 |
| networking | no | partial | partial | no | v2.0 apps layer [inferred] |
| projection/view | yes | partial | yes | yes | v3.0 for protocol view model; v1.1 for heritage |
| adapters | no | no | partial | yes | v4.0 |
| blackboard/local runtime | no | no | no | no | apps/blackboard-web + apps/locals-only [inferred] |
| demo/publication surface | yes | partial | partial | no | v1.1 docs/projections lineage |

## 4. Version-by-version deep assessment
### v1.1
- Implemented code surfaces:
  - `ulp-v1.1/bin/run.sh`
  - `ulp-v1.1/bin/decode_trace.sh`
  - `ulp-v1.1/bin/observe.sh`
  - `ulp-v1.1/bin/proc.awk`, `ulp-v1.1/bin/canon.awk`, `ulp-v1.1/bin/hash.sh`
- Test/gate surfaces:
  - `ulp-v1.1/validate.sh` (exists; in current checkout it fails world validation)
- Docs/spec surfaces:
  - `ulp-v1.1/README.md`
  - `dev-docs/ULP-v1.1-ARCHITECTURE.txt`
  - `dev-docs/ULP-v1.1-SEAL.md`
- What it canonizes:
  - Sealed invariant framing of trace authority and pure projections.
- What later versions inherited:
  - Trace-first model, dotfile authority, replay/reconstruction pattern.
- What remained unique to this version:
  - Sealed architecture identity and strongest historical projection-story packaging.
- What must not be misread as current authority:
  - v1.1 as default active runtime center; in this checkout runtime operability is partial due executable mode requirements (`run.sh` requires executable `bin/hash.sh`).
- Exact evidence paths:
  - `ulp-v1.1/bin/run.sh`, `ulp-v1.1/validate.sh`, `ulp-v1.1/README.md`.

### v2.0
- Implemented code surfaces:
  - `ulp-v2.0/bin/run.sh`, `ulp-v2.0/bin/canon.sh`, `ulp-v2.0/bin/hash.sh`
  - `ulp-v2.0/bin/policy.sh`, `ulp-v2.0/bin/geometry.sh`, `ulp-v2.0/bin/replica.sh`
- Test/gate surfaces:
  - `ulp-v2.0/test_determinism.sh` (passes in current workspace)
- Docs/spec surfaces:
  - `ulp-v2.0/README.md`
  - `dev-docs/ULP-v2.0-SPECIFICATION.md`
- What it canonizes:
  - Deterministic trace core plus derived policy/geometry/replica metadata.
- What later versions inherited:
  - Policy metadata fields and derived geometry/replica logic carried into v3 runner.
- What remained unique to this version:
  - Clear bridge framing between sealed core and expanded policy surfaces.
- What must not be misread as current authority:
  - v2 as strongest execution-law line (v3 now stronger by tests/spec cohesion).
- Exact evidence paths:
  - `ulp-v2.0/bin/run.sh`, `ulp-v2.0/test_determinism.sh`, `ulp-v2.0/README.md`.

### v3.0
- Implemented code surfaces:
  - `ulp-v3.0/bin/run.sh`, `ulp-v3.0/bin/poly.awk`, `ulp-v3.0/bin/canon.sh`, `ulp-v3.0/bin/view_model.sh`
- Test/gate surfaces:
  - `ulp-v3.0/test_conformance.sh`
  - `ulp-v3.0/test_determinism.sh`
  - `ulp-v3.0/test_cpnf.sh`, `ulp-v3.0/test_admissibility.sh`, `ulp-v3.0/test_trace_schema.sh`, `ulp-v3.0/test_view_model.sh`
  - Conformance and determinism pass in current workspace.
- Docs/spec surfaces:
  - `ulp-v3.0/ULP-v3.0-SPEC.md`
  - `ulp-v3.0/ULP-v3.0-GRAMMAR.md`
  - `ulp-v3.0/ULP-v3.0-VIEW.md`
- What it canonizes:
  - Strongest current deterministic execution law: CPNF canonicalization + algebra admissibility + schema-tested traces.
- What later versions inherited:
  - v4 adapter directly consumes v3 trace format (`adapter.mjs --trace .../v3/trace.log`).
- What remained unique to this version:
  - Best combined implementation+test+spec authority for kernel behavior.
- What must not be misread as current authority:
  - v3 as full networking/runtime product line (networking remains app-layer).
- Exact evidence paths:
  - `ulp-v3.0/bin/run.sh`, `ulp-v3.0/test_conformance.sh`, `ulp-v3.0/ULP-v3.0-SPEC.md`.

### v4.0
- Implemented code surfaces:
  - `ulp-v4.0/bin/adapter.mjs`
  - `ulp-v4.0/bin/canon-core.mjs`
  - `ulp-v4.0/bin/delta.mjs`
- Test/gate surfaces:
  - No dedicated `test_*.sh` suite found in `ulp-v4.0`; basic adapter + delta run works.
- Docs/spec surfaces:
  - `ulp-v4.0/README.md`
  - `dev-docs/v4/ULP-v4-*.md`
- What it canonizes:
  - Read-only semantic-core adaptation and delta comparison of traces.
- What later versions inherited:
  - [inferred] none yet; v4 appears additive adapter line, not parent kernel.
- What remained unique to this version:
  - Explicit adapter/projection contract focus separated from execution runtime.
- What must not be misread as current authority:
  - “v4 replaces v3 kernel” is unsupported by implementation.
- Exact evidence paths:
  - `ulp-v4.0/README.md`, `ulp-v4.0/bin/adapter.mjs`, `ulp-v4.0/bin/delta.mjs`.

## 5. Authority shift narrative
- Hashing/canonicalization stability starts earlier (v1.1/v2.0) but becomes strongest, most test-backed constitutional authority in v3 (`v3 canon + conformance`).
- Replay/determinism exists as principle in v1.1, becomes executable and verifiable in v2, and reaches strongest tested state in v3 (multiple test gates).
- Execution algebra becomes explicit and strongest in v3 (`poly.awk`, admissibility tests).
- Adapters appear concretely in v4, but as read-only layer without execution authority.
- Runtime/projection split becomes explicit in apps and v4 language: core runners build traces; apps and v4 consume/relay/project.
- Demo/publication surfaces diverge from kernels via `docs/` and app UIs, which present derived outputs rather than canonical truth engines.

## 6. Non-linear inheritance
- Older versions still matter:
  - v1.1 remains strongest sealed historical constitutional narrative and projection heritage reference.
  - v2.0 remains a bridge for policy/geometry lineage not explained as clearly elsewhere.
- Newer versions do not uniformly supersede:
  - v4 is mostly adapter/spec/projection and does not supersede v3 execution kernel.
- Apps evolve in parallel:
  - `apps/blackboard-web`, `apps/locals-only`, `apps/p2p-server*`, `apps/ulp-chat`, `apps/ulp-sdk` are runtime/projection surfaces that borrow ideas from version lines but are not themselves version successors.
  - `apps/core -> ../ulp-v3.0` indicates current app-context kernel anchor is v3.

## 7. Current production reading
- Strongest version line now: `ulp-v3.0` for deterministic execution, canonicalization, and spec/test coherence.
- Older versions still required:
  - v1.1 for sealed invariants and heritage of projection/story artifacts.
  - v2.0 for bridge context on policy/geometry/replica derivation.
- Newer not yet authority-bearing as kernel:
  - v4 is authority-bearing for adapters/delta only, not for execution runtime law.
- Live constitutional center for maintainers:
  - treat `ulp-v3.0` as kernel authority, with app surfaces explicitly classified as transport/projection/advisory layers.

## 8. Unsafe simplifications to avoid
- “v4 replaces v3” when v4 implements adapter/delta tools and explicitly does not execute worlds.
- “all ULP versions are equivalent” despite different scope, tests, and maturity.
- “apps are the protocol” when apps mostly relay, render, or compose derived views.
- “projection demos are canonical” for `docs/` generated outputs.
- “archive means irrelevant” or inverse overtrust; archive is historical evidence, not active authority.

## 9. Final constitutional verdict
Current canonical center: ULP v3.0
Strongest historical ancestor still needed: ULP v1.1
Strongest deterministic execution line: ULP v3.0
Strongest adapter/projection line: ULP v4.0 (adapter layer) + apps/ulp-sdk for projection helpers
Version most likely to be overread: ULP v4.0
Version most likely to be underread: ULP v2.0
Best next cleanup step: de-duplicate app subtrees under `apps/ulp-chat` that mirror top-level `apps/p2p-server*` and `apps/ulp-sdk`

Version line most suitable for current authority: ULP v3.0
Version line most suitable for historical grounding: ULP v1.1
Version line most suitable for demo/projection heritage: ULP v1.1
Version line most suitable for adapter experimentation: ULP v4.0
Biggest documentation distortion currently present: recency bias that can overstate v4 authority and understate v3 runtime centrality
Most important corrective rewrite completed here: explicit surface-by-surface authority matrix across v1.1-v4.0 with implementation evidence
Most important remaining version-line question: whether v4 will gain executable conformance gates sufficient to bear any kernel-level authority
