# ULP v3.0 (POSIX/awk core)

This folder provides a platform-agnostic ULP v3.0 core in POSIX sh + awk.
It refines v1.1 and v2.0 by formalizing the execution algebra (CPNF,
open-envelope, weighted degree) and canonicalizing `.procedure` / `.interrupt`
for WID determinism.

## Structure

- `bin/` core engine scripts (POSIX sh + awk)
- `world/` example world dotfiles
- `interrupts/` example interrupt handlers
- `test_determinism.sh` deterministic trace check
- `ULP-v3.0-SPEC.md` formal specification
- `ULP-v3.0-VIEW.md` view specification and renderer contract
- `bin/view_model.sh` reference view model renderer

## Quick start

```
cd ulp-v3.0
printf 'hello\nworld\n' | ./bin/run.sh world out
```

Inspect derived policy/geometry/replicas in the trace:

```
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

## Determinism

```
sh ./test_determinism.sh
```

## Conformance tests

```
sh ./test_conformance.sh
```

## View model renderer (v3)

```
sh ./bin/view_model.sh examples/quadrants-octree.view examples/trace-quadrants.json /tmp/view-model.json
```

## Notes

- `.procedure` and `.interrupt` are canonicalized to CPNF for WID hashing.
- `.interface` is optional and projection-only; it does not affect execution.
- P2P servers and SDKs are intentionally excluded from this core.
