# AGENTS.md (ULP v3.0)

## Scope
This folder is the platform-agnostic POSIX/awk core for ULP v3.0. It refines v1.1 and v2.0 with formal execution algebra, CPNF canonicalization, and a conformance suite.

## Key Files
- Spec: `ULP-v3.0-SPEC.md`
- Grammar: `ULP-v3.0-GRAMMAR.md`
- Core engine: `bin/run.sh`, `bin/poly.awk`, `bin/canon.sh`
- Conformance suite: `test_conformance.sh`
- Example world: `world/`

## Commands
- Run: `printf 'hello\nworld\n' | ./bin/run.sh world out`
- Determinism: `sh ./test_determinism.sh`
- Conformance: `sh ./test_conformance.sh`

## Invariants
- Determinism is mandatory (byte-identical traces).
- Dotfiles are the only authority.
- `.procedure` and `.interrupt` must be canonicalized to CPNF before WID hashing.
