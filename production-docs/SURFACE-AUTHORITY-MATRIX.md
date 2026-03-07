| Surface | Best version | Evidence | Why this version currently wins | Dangerous confusion |
|---|---|---|---|---|
| canonicalization | v3.0 | `ulp-v3.0/bin/canon.sh`, `ulp-v3.0/test_cpnf.sh` | CPNF + active tests + integrated runner path | assuming v4 canonical JSONL supersedes world canonicalization |
| hashing | v3.0 | `ulp-v3.0/bin/hash.sh`, `bin/run.sh` | Kernel hash path tied to tested execution pipeline | treating app/browser hashes as protocol authority |
| trace/replay | v3.0 | `ulp-v3.0/bin/run.sh`, `test_trace_schema.sh`, determinism tests | strongest current tested trace law | reading app event logs as equivalent to protocol trace |
| determinism tests | v3.0 | `ulp-v3.0/test_conformance.sh`, `test_determinism.sh` | broadest passing gate set | equating v4 tool determinism claims with full kernel determinism |
| grammar/spec | v3.0 | `ULP-v3.0-SPEC.md`, `ULP-v3.0-GRAMMAR.md`, `ULP-v3.0-VIEW.md` | closest match between docs and runnable tests | relying on research docs as normative spec |
| execution algebra | v3.0 | `ulp-v3.0/bin/poly.awk`, `test_admissibility.sh` | explicit admissibility implementation + tests | attributing algebra authority to app-level filters |
| view model / projection | v3.0 | `ulp-v3.0/bin/view_model.sh`, `test_view_model.sh` | tested projection contract from trace JSON + .view | treating generated HTML assets as authoritative trace state |
| adapters | v4.0 | `ulp-v4.0/bin/adapter.mjs`, `bin/delta.mjs` | dedicated adapter/canonical-core/delta toolchain | treating adapter outputs as execution replacements |
| networking / peer sync | v2.0 apps layer [inferred] | `apps/p2p-server/server/main.go`, `apps/p2p-server-node/server.js`, smoke tests | concrete transport implementations live in apps, not kernel dirs | assuming version dir alone provides production networking |
| local runtime / blackboard | app layer [inferred] | `apps/blackboard-web/src/*`, `apps/locals-only/client/*` | only implemented local runtime/feed surfaces for these concerns | mistaking relay/feed stores for protocol truth engine |
| demo/publication artifacts | v1.1 heritage | `docs/projections/*`, `docs/README.md`, `ulp-v1.1/projections/*` | strongest lineage of published projection artifacts traces back to v1.1 ecosystem | assuming demos imply active kernel authority |
