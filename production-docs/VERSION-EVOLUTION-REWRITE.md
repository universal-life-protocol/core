## A. What changed across versions
- v1.1 established sealed trace-calculus framing with runnable shell/awk core and reconstruction/projection tooling.
- v2.0 added deterministic policy/geometry/replica derivation in the runner and documented network framing, while transport implementations moved into apps.
- v3.0 formalized execution algebra and canonicalization (CPNF) with the strongest conformance/testing surface.
- v4.0 introduced a read-only adapter/canonical-core/delta layer (`adapter.mjs`, `canon-core.mjs`, `delta.mjs`) rather than a new execution kernel.

## B. What remained invariant
- Trace-first constitutional model (trace as authority) remains across version lines.
- Determinism as a core requirement persists across v1.1-v3.0 implementations.
- Dotfile-centered world constraints remain foundational.
- Projection surfaces remain non-authoritative/derived by design in kernel docs.

## C. What split into separate app/runtime surfaces
- Networking and peer transport are primarily implemented in `apps/p2p-server` and `apps/p2p-server-node`.
- Local runtime/feed surfaces are in `apps/blackboard-web` and `apps/locals-only`.
- Chat and explain/ledger runtime is in `apps/ulp-chat`.
- Projection helper packaging is in `apps/ulp-sdk`.
- These app surfaces are parallel consumers/extensions, not direct kernel successors.

## D. What became research-only
- Much of `dev-docs/v1.5`, `dev-docs/Architecture`, and `dev-docs/v4` remains conceptual unless directly tied to runnable scripts or tests.
- Archive material (`archive/*`) is historical evidence and lineage reference, not active constitutional runtime authority.

## E. What still needs consolidation
- Duplicate app stacks under `apps/ulp-chat` (`p2p-server`, `p2p-server-node`, `ulp-sdk`) versus top-level equivalents.
- Clear single-source-of-truth map for which docs are normative per surface.
- Better explicit status labels for version lines in production docs to reduce v4-overread and v3-underread risk.
