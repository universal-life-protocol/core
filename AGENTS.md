# AGENTS.md

## Repository Overview
- `ulp-v3.0/` is the platform-agnostic POSIX/awk core (spec + conformance tests).
- `ulp-v2.0/` is the v2.0 reference implementation (core + P2P + SDK).
- `ulp-v1.1/` is the sealed v1.1 implementation.
- `docs/` and `dev-docs/` contain design and spec material (v3 specs live in `dev-docs/v3/`).
- `out/` holds generated traces; do not hand-edit.

## Core Principles
- Determinism is primary: same inputs and dotfiles must produce byte-identical traces.
- Dotfiles are the only authority for execution behavior.
- Execution is append-only and self-encoding.

## v3.0 Focus (POSIX/awk)
- Spec: `ulp-v3.0/ULP-v3.0-SPEC.md`
- Conformance suite: `ulp-v3.0/test_conformance.sh`
- Determinism test: `ulp-v3.0/test_determinism.sh`
- Canonicalization: `.procedure` and `.interrupt` must be CPNF before WID hashing.

## Common Commands
### v3.0
- `cd ulp-v3.0`
- `printf 'hello\nworld\n' | ./bin/run.sh world out`
- `sh ./test_conformance.sh`

### v2.0
- `cd "ulp-v2.0"`
- `echo -e 'hello\nworld' | ./bin/run.sh world out`
- `./test_determinism.sh`

### v1.1
- `cd ulp-v1.1`
- `echo "hello world" | ./bin/run.sh world out`
- `./bin/observe.sh world out/trace.log`

## Implementation Notes
- Shell scripts use POSIX `sh` and `set -eu`.
- Keep world dotfiles under each `world/` directory.
- Interrupt handlers live in `interrupts/` and should be executable.
- Prefer byte-for-byte trace comparisons (`cmp`) for determinism checks.
