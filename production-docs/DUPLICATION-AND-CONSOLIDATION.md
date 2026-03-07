## Cluster 1
Cluster:
- `p2p-server` duplication across top-level apps and `apps/ulp-chat` subtree.

Members:
- `apps/p2p-server`
- `apps/ulp-chat/p2p-server`

What overlaps:
- Same conceptual Go/WebRTC trace-serving server shape, similar folder structure (`server`, `recording-pipeline`, `trace-queries`, `website`).

Which appears strongest:
- `apps/p2p-server` (canonical top-level app location).

Which appears historical:
- `apps/ulp-chat/p2p-server` (embedded copy).

Safe consolidation recommendation:
- Keep only top-level `apps/p2p-server`; replace nested copy with pointer docs or symlink policy.

Unsafe conflations to avoid:
- Assuming embedded copy and top-level copy are always synchronized.

## Cluster 2
Cluster:
- `p2p-server-node` duplication across top-level apps and `apps/ulp-chat` subtree.

Members:
- `apps/p2p-server-node`
- `apps/ulp-chat/p2p-server-node`

What overlaps:
- Node libp2p + HTTP server, similar readme/scripts, same operational purpose.

Which appears strongest:
- `apps/p2p-server-node` (dedicated top-level app).

Which appears historical:
- `apps/ulp-chat/p2p-server-node` (embedded copy).

Safe consolidation recommendation:
- Standardize on top-level node server and import shared modules from one location.

Unsafe conflations to avoid:
- Treating nested server as independent production authority.

## Cluster 3
Cluster:
- `ulp-sdk` duplication across top-level apps and `apps/ulp-chat` subtree.

Members:
- `apps/ulp-sdk`
- `apps/ulp-chat/ulp-sdk`

What overlaps:
- Same projection helper functions (`recordFromTrace`, `projectionHTML`, `projectionSchema`).

Which appears strongest:
- `apps/ulp-sdk` (standalone SDK surface).

Which appears historical:
- `apps/ulp-chat/ulp-sdk` (local embedded copy).

Safe consolidation recommendation:
- Keep one SDK package and reference it from dependent apps.

Unsafe conflations to avoid:
- Editing only one copy and assuming all runtime consumers updated.

## Cluster 4
Cluster:
- Generated or repeated trace output directories.

Members:
- `ulp-v2.0/out`, `ulp-v2.0/out1`, `ulp-v2.0/out2`
- `ulp-v3.0/out1`, `ulp-v3.0/out2`
- `apps/ulp-chat/out`, `apps/ulp-chat/out1`, `apps/ulp-chat/out2`
- `ulp-v1.1/out`, `ulp-v1.1/out2`, `ulp-v1.1/testout`

What overlaps:
- Test/demo output traces used as fixtures or residual run artifacts.

Which appears strongest:
- Version-line test scripts that intentionally use `out1/out2` for determinism checks.

Which appears historical:
- Stale outputs committed without clear fixture intent [inferred].

Safe consolidation recommendation:
- Separate committed fixtures from ephemeral outputs; document retention policy.

Unsafe conflations to avoid:
- Reading committed outputs as canonical current state.

## Cluster 5
Cluster:
- Documentation duplication across research lineages.

Members:
- `dev-docs/v1`, `dev-docs/v1.5`, `dev-docs/v2`, `dev-docs/v3`, `dev-docs/v4`
- Overlapping high-level claims in `production-docs/*` and root `README.md`

What overlaps:
- Conceptual restatements of architecture, evolution, and objectives with varying maturity.

Which appears strongest:
- Version-line specs and tested code-adjacent docs (`ulp-v3.0/*.md`, `ulp-v2.0/README.md`, sealed v1.1 references).

Which appears historical:
- v1.5 and exploratory architecture narratives without executable anchors.

Safe consolidation recommendation:
- Add explicit evidence class labels (implemented/speculative/archival) and link each claim to runnable code/tests.

Unsafe conflations to avoid:
- Treating research prose as active production contract.

## Cluster 6
Cluster:
- Archive vs root version-line overlap.

Members:
- `archive/ulp-v1.0` vs `ulp-v1.1`
- `archive/ulp-v1.1/v2` vs `ulp-v2.0`

What overlaps:
- Similar run/hash/canon/test surfaces and narrative docs across historical and active paths.

Which appears strongest:
- Root version lines (`ulp-v2.0`, `ulp-v3.0`) for active use.

Which appears historical:
- `archive/*` by definition.

Safe consolidation recommendation:
- Keep archive immutable; add stronger “not active runtime” banners and cross-links to active equivalents.

Unsafe conflations to avoid:
- Mistaking archive copies for production-maintained implementations.
