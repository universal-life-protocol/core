# ULP v3.0 User Guide

## 1. Overview

ULP v3.0 is a deterministic execution protocol defined by world dotfiles and a POSIX/awk core.
Execution is: (BALL + input) -> POINT. The output is an append-only trace.

This folder provides:
- Core engine (`bin/`)
- Example world (`world/`)
- Conformance tests (`test_*.sh`)
- Formal spec (`ULP-v3.0-SPEC.md`)

## 2. Prerequisites

- POSIX `sh`
- `awk`, `sort`, `base64`
- One of: `sha256sum`, `shasum`, or `openssl`

## 3. Quick Start

```
cd ulp-v3.0
printf 'hello\nworld\n' | ./bin/run.sh world out
```

Inspect core metadata:

```
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

## 4. Determinism and Conformance

Run determinism check:

```
sh ./test_determinism.sh
```

Run the full conformance suite:

```
sh ./test_conformance.sh
```

## 5. World Dotfiles (Essentials)

Required dotfiles live in `world/`:

- `.atom`      atom declarations (and weights)
- `.manifest`  global constraints
- `.procedure` envelope definition
- `.interrupt` interrupt fragments + `on_start`
- `.include` / `.ignore` interrupt allow/deny
- `.sequence`, `.schema`, `.view`, `.record`, `.symmetry`, `.genesis`, `.env`

The core authority is entirely in these dotfiles.

## 6. Interrupts

Interrupt handlers live in `interrupts/` and must be executable:

```
chmod +x interrupts/*.sh
```

Only admitted interrupts execute, and each executes once.

## 7. Canonicalization (CPNF)

`.procedure` and `.interrupt` are canonicalized before hashing the WID.
Canonicalization rules are defined in `ULP-v3.0-GRAMMAR.md` and enforced by `bin/canon.sh`.

## 8. Output Trace

The output is `out/trace.log` and includes:
- Headers (`HDR`, `BALL`)
- Algebra (`ALG_*`)
- I/O (`STDIN`, `STDOUT`, `STDERR`)
- Execution (`EXEC`, `EXIT`)
- Policy/geometry metadata (`POLICY`, `GEOMETRY`, `REPLICA`)
- Self-encoding bundle (`MANIFEST`, `FILE`, `DATA`)

## 9. What Remains to Complete v3.0

### 9.1 Spec alignment tasks
- Define normative grammar and accepted tokens for `.schema`, `.record`, `.view`, `.env`, `.genesis`.
- Pin exact trace schema and required record ordering (formal trace EBNF).
- Document error codes and failure semantics in a dedicated section.

### 9.2 Implementation tasks
- Validate identifiers in `.procedure` / `.interrupt` against `.atom` earlier in the parse phase.
- Extend `bin/canon.sh` to enforce full identifier validation on algebra tokens.
- Add conformance tests for:
  - manifest bans and weighted degree limits
  - open-envelope shadow rules (`longest_prefix`)
  - strict CPNF serialization including sign formatting

### 9.3 Platform-neutral packaging
- Provide a minimal installer script and a checksum manifest for `bin/`.
- Add a `Makefile` or `sh` runner for common tasks.

## 10. Reference Files

- Spec: `ULP-v3.0-SPEC.md`
- Grammar: `ULP-v3.0-GRAMMAR.md`
- Conformance: `test_conformance.sh`

