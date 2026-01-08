# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ULP v3.0 is a deterministic execution protocol implemented in POSIX sh + awk. The core principle is:

**(BALL + input) → POINT**

Where BALL is the world definition (dotfiles), input is stdin, and POINT is the deterministic, append-only trace. Identical inputs produce byte-identical outputs.

This is a platform-agnostic core that refines v1.1 and v2.0 by:
- Formalizing execution algebra with Canonical Polynomial Normal Form (CPNF)
- Defining admissibility rules for interrupt execution
- Including conformance test suite and view model renderer
- Maintaining v2.0's E8×E8 policy layer for compatibility

## Essential Commands

### Execution

```bash
# Execute trace (stdin → stdout via world definition)
printf 'hello\nworld\n' | ./bin/run.sh world out

# Inspect derived metadata
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log

# View trace structure
cat out/trace.log
```

### Testing

```bash
# Verify determinism (CRITICAL invariant)
sh ./test_determinism.sh

# Run full conformance suite
sh ./test_conformance.sh

# Individual test suites
sh ./test_cpnf.sh              # CPNF canonicalization
sh ./test_admissibility.sh     # Algebra admissibility
sh ./test_trace_schema.sh      # Trace format validation
sh ./test_view_model.sh        # View renderer
```

### View Rendering

```bash
# Render view model from trace
sh ./bin/view_model.sh examples/quadrants-octree.view examples/trace-quadrants.json /tmp/view-model.json
```

### Canonicalization

```bash
# Canonicalize dotfile to CPNF
sh ./bin/canon.sh world/.procedure
sh ./bin/canon.sh world/.interrupt

# Test polynomial parsing
awk -f bin/poly.awk world/.interrupt
```

## Architecture

### Core Execution Flow

1. **World Identity (WID)**: `sha256(canonicalized_dotfiles)` where `.procedure` and `.interrupt` MUST be in CPNF form
2. **Algebra Evaluation**: Validate interrupt admissibility using polynomial algebra
3. **Execution**: Execute admitted interrupts exactly once, in deterministic order
4. **Trace Generation**: Append-only log of all execution events
5. **RID Calculation**: `sha256(trace)` produces the result identity
6. **Policy Derivation**: E8×E8 lattice seeds from RID (v2 compatibility)
7. **Self-Encoding**: Embed complete reconstruction bundle in trace

### World Dotfiles (The Only Authority)

World directory must contain these dotfiles (all non-executable, identifier-only):

- `.genesis` - Origin metadata (user, runtime, paradigm)
- `.env` - Environment constraints (stdin, stdout, effects)
- `.atom` - Atom declarations with optional weights
- `.manifest` - Global constraints (max_degree, max_wdegree, banned prefixes)
- `.procedure` - Polynomial envelope defining admissible capacity (CPNF required)
- `.interrupt` - Polynomial fragments per interrupt + on_start (CPNF required)
- `.include` / `.ignore` - Interrupt allowlist/blocklist
- `.sequence` - Ordering constraints
- `.schema` - Trace structure specification
- `.view` - Projection configuration
- `.record` - Recording metadata
- `.symmetry` - Symmetry declarations and algebra config

Interrupt handlers live in `interrupts/*.sh` and must be executable.

### Execution Algebra

**Atoms**: Declared in `.atom`, e.g., `atom line weight 2`

**Monomials**: Ordered sequences like `scope.order.bind`
- Degree: number of atoms
- Weighted degree: sum of atom weights

**Polynomials**: Sets of monomials with integer coefficients
- `.procedure` defines envelope polynomial E with constraints
- `.interrupt` defines fragment polynomial I per interrupt name

**Admissibility** (first-failure-wins in CPNF order):
1. All atoms must be declared in `.atom`
2. Manifest constraints must pass (max_degree, max_wdegree, banned prefixes)
3. Envelope containment (closed mode) or shadow matching (open mode)
4. Capacity: `abs(I(m)) <= abs(E(m))` or shadow capacity
5. Sign constraint: if `sign=same`, then `sign(I(m)) == sign(E(m))`
6. Procedure max_wdegree must pass if defined

**Modes**:
- `closed`: All monomials in I must exist in E
- `open`: Missing monomials use shadow matching (`first_atom` or `longest_prefix`)

### CPNF Canonicalization

Canonical Polynomial Normal Form ensures deterministic WID hashing:

1. Combine like monomials by summing coefficients
2. Drop zero coefficients
3. Order terms by: (a) monomial length ascending, (b) lexicographic byte order
4. Serialize as `±c monomial` (e.g., `+1 line`, `-2 scope.bind`)

**Critical**: `.procedure` and `.interrupt` MUST be in CPNF before WID calculation.

### Trace Format

Tab-separated records (see `ULP-v3.0-SPEC.md` for full schema):

- `HDR`, `BALL` - Header and world identity
- `STDIN`, `STDOUT`, `STDERR` - I/O events
- `CLAUSE`, `EXEC`, `EXIT` - Execution events
- `ALG_*` - Algebra evaluation records (PROC_POLY, INTR_POLY, ADMIT, etc.)
- `POLICY`, `GEOMETRY`, `REPLICA` - E8×E8 derived metadata (v2 compatibility)
- `MANIFEST`, `FILE`, `DATA`, `END_FILE` - Self-encoding bundle
- `END` - Trace terminator

## Key Implementation Files

### Core Engine (`bin/`)

- `run.sh` - Main execution engine, orchestrates entire flow
- `poly.awk` - Polynomial algebra processor (parsing, CPNF, admissibility)
- `canon.sh` - CPNF canonicalization for dotfiles
- `hash.sh` - Portable SHA-256 (tries sha256sum, shasum, openssl)
- `self_encode.sh` - Appends self-encoding bundle to trace
- `policy.sh` - E8×E8 policy seed derivation from RID
- `geometry.sh` - Geometry metadata generation
- `replica.sh` - Replica slot calculation
- `view_model.sh` - View renderer (trace + .view → view model JSON)
- `decomp.sh` - Polynomial decomposition utilities
- `explain.sh` - Human-readable algebra explanations

### Test Suite

- `test_determinism.sh` - Verifies byte-identical traces (CRITICAL)
- `test_conformance.sh` - Runs all conformance tests
- `test_cpnf.sh` - CPNF ordering validation
- `test_admissibility.sh` - Algebra admissibility rules
- `test_trace_schema.sh` - Trace format compliance
- `test_view_model.sh` - View rendering validation

### Example World

- `world/` - Example world with all required dotfiles
- `interrupts/` - Example interrupt handlers (PRINT.sh, etc.)
- `examples/` - Example traces and view configurations

## Development Guidelines

### Modifying Code

1. **Maintain determinism**: Same inputs MUST produce byte-identical traces. Always run `test_determinism.sh` after changes.
2. **Dotfiles are non-executable**: Only identifier-only content, no control flow, no computation
3. **CPNF is mandatory**: `.procedure` and `.interrupt` must be canonicalized before WID
4. **Projections are pure**: Views cannot execute code, perform I/O, or have side effects
5. **POSIX sh only**: No bash-isms, portable constructs only (Termux compatibility)
6. **Portable tools**: Handle platform differences (stat, sha256, base64)

### Testing Determinism

```bash
# Generate trace twice with identical inputs
printf "test\n" | ./bin/run.sh world out1
printf "test\n" | ./bin/run.sh world out2

# MUST be byte-for-byte identical
cmp out1/trace.log out2/trace.log
```

### Adding New Interrupts

1. Create handler: `interrupts/NEW_INTERRUPT.sh` (must be executable)
2. Add to `.include`: `echo "NEW_INTERRUPT" >> world/.include`
3. Define polynomial in `.interrupt`:
   ```
   interrupt NEW_INTERRUPT v3
   poly:
     +1 atom
   end poly
   end interrupt
   ```
4. Update `.procedure` envelope if needed to admit the fragment
5. Test admissibility: `sh ./test_admissibility.sh`

### Debugging Traces

```bash
# View all algebra records
awk -F '\t' '/^ALG_/' out/trace.log

# View admitted interrupts
awk -F '\t' '$1=="ALG_ADMIT"' out/trace.log

# View execution events
awk -F '\t' '$1=="EXEC"' out/trace.log

# View policy/geometry
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log

# Decode base64 payloads
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d

# View self-encoding manifest
awk '/^MANIFEST/,/^END$/' out/trace.log
```

### Working with CPNF

```bash
# Canonicalize and verify
sh ./bin/canon.sh world/.procedure > /tmp/proc.canon
diff world/.procedure /tmp/proc.canon

# Parse polynomial
awk -f bin/poly.awk world/.interrupt

# Check admissibility manually
awk -v WORLD_DIR=world -f bin/poly.awk
```

## Critical Invariants

### Determinism (MANDATORY)

- No timestamps (wall-clock time)
- No randomness
- No network literals (IPs, ports, MACs)
- Trace-time ordering only (causality, not real time)
- Canonical sorting for all dotfiles and polynomials

### Architectural Principles

1. **Trace is ground truth**: Immutable, append-only
2. **World is non-executable**: Authority is in dotfiles, not code
3. **Projections are pure**: No exec, no I/O, no side effects
4. **Effects are forward-only**: No retroactive changes
5. **Information flows forward**: World → Execution → Trace → Projection

### CPNF Requirements

- `.procedure` and `.interrupt` MUST be in CPNF for WID calculation
- Use `bin/canon.sh` to canonicalize
- Admissibility evaluation uses CPNF ordering (first-failure-wins)
- Polynomial terms ordered by length, then lexicographically

## Termux/POSIX Compatibility

This codebase is developed on Termux (Android):

1. Use `#!/bin/sh` and `set -eu`
2. Portable stat handling in self-encoding
3. Hash tool detection (sha256sum → shasum → openssl)
4. Base64 decode with `-d` flag
5. No GNU-isms (avoid bash arrays, process substitution, etc.)
6. Awk uses temp files instead of `asort()` when needed

## Documentation

- `ULP-v3.0-SPEC.md` - Formal specification (normative)
- `ULP-v3.0-GRAMMAR.md` - EBNF grammar and vocabulary (normative)
- `ULP-v3.0-VIEW.md` - View specification and renderer contract (normative)
- `USER-GUIDE.md` - User-facing guide and completion roadmap
- `AGENTS.md` - Quick reference for automated agents
- `README.md` - Quick start guide

## Common Patterns

### Minimal World Creation

```bash
mkdir -p myworld
cd myworld

# Create required dotfiles (see examples/world/ for templates)
echo "user $(whoami)" > .genesis
echo "runtime posix" >> .genesis
echo "stdin file" > .env
echo "stdout file" >> .env
echo "atom line" > .atom

# Add .procedure, .interrupt, .manifest, .schema, .sequence,
# .include, .ignore, .view, .record, .symmetry
# See world/ directory for complete examples
```

### Inspecting Algebra

```bash
# View procedure envelope
awk -F '\t' '$1=="ALG_PROC_POLY"' out/trace.log

# View interrupt fragments
awk -F '\t' '$1=="ALG_INTR_POLY"' out/trace.log

# View admissibility decisions
awk -F '\t' '$1=="ALG_ADMIT" {print $2, $3}' out/trace.log
```

### Policy Inspection (v2 Compatibility)

```bash
# Extract E8 seeds
grep "^POLICY" out/trace.log

# Check chirality
awk -F '\t' '$1=="POLICY" && $2=="chirality" {print $3}' out/trace.log

# View geometry selection
grep "^GEOMETRY" out/trace.log

# View replica slots
grep "^REPLICA" out/trace.log
```

## Error Handling

Implementations fail fast with non-zero exit codes when:

- Required dotfiles are missing
- Required tools unavailable (awk, base64, sha256)
- Interrupt handlers missing or non-executable
- Algebra evaluation fails (admissibility violation)
- CPNF canonicalization fails
- Trace schema validation fails
