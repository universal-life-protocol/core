# ULP Chat Agent Notes

## Scope
- `ulp-chat/` is a standalone chat scaffold layered on the ULP v2 engine with v3-style memory gating.
- Treat `world/` dotfiles as the only authority for memory admission.

## Key Files
- `server.js` Express entrypoint.
- `lib/ulp.js` algebraic gating (calls `bin/poly.awk`).
- `lib/ledger.js` append-only ledger (authoritative trace).
- `lib/context.js` projections only; must honor redactions.
- `lib/views.js` projection snapshots; never authoritative.
- `world/.procedure`, `world/.interrupt`, `world/.input`, `world/.output`, `world/.interface`.

## Rules
- **Traces are authoritative. Views are projections.**
- Do not silently delete or overwrite ledger entries.
- Redactions append `redact.request` markers and must be honored in projections.
- Keep shell scripts POSIX `sh` (`#!/bin/sh`, `set -eu`) with 4-space indentation where applicable.
- Avoid hand-editing generated data under `out/` or `ledger/`.

## Testing
- Prefer determinism checks: `./test_determinism.sh` (for engine).
- For chat layer, verify:
  - `/chat` writes ledger entries.
  - `/views/*` reflect redactions.
  - `/explain/:claimId` returns trace-backed reasoning.
