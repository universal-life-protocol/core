# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is **ULP v2.0** - a reference implementation of the Universal Life Protocol that extends v1.1 with E8×E8 policy derivation, geometric routing, and deterministic replication. The core principle: **(BALL + input) → execute once → POINT**.

**Status**: Reference implementation
**Spec Version**: 2.0
**Compliance**: ✓ Deterministic, ✓ Self-Encoding, ✓ Policy-Derived

## Essential Commands

### Execute and Create a POINT (Trace)

```bash
echo -e 'hello\nworld' | ./bin/run.sh world out
```

This is the primary execution command. It:
1. Computes WID (World ID) from dotfiles
2. Executes the entry procedure once
3. Generates an immutable trace
4. Derives E8×E8 policy metadata
5. Outputs the RID (Record ID)

### Test Determinism

```bash
./test_determinism.sh
```

Critical invariant verification: same inputs must produce byte-for-byte identical traces. This test verifies:
- RID consistency
- Trace binary identity
- Policy seed determinism
- Geometry selection determinism
- Replica slot determinism

### Inspect Policy Derivation

```bash
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

Shows the E8×E8 derived metadata appended to every trace.

### Manual Utilities

```bash
# Compute WID from world dotfiles
./bin/canon.sh world

# Derive policy from RID
./bin/policy.sh <RID>

# Derive geometry from E8L/E8R seeds
./bin/geometry.sh <E8L> <E8R>

# Compute replica slots
./bin/replica.sh <E8L> <E8R> <geometry_size>

# Hash any input (portable SHA-256)
echo "hello" | ./bin/hash.sh
```

## Core Architecture

### The Prime Rule

**If it is not expressible as a dotfile, it is not part of the system.**

All behavior, authority, symmetry, projection, routing, and replication must be derivable from dotfiles.

### Two Primitives

1. **BALL (World)**: Non-executable constraint interior, identified by WID = sha256(canonicalize(dotfiles))
2. **POINT (Record)**: Immutable execution trace, identified by RID = sha256(trace_bytes)

### Execution Flow (bin/run.sh)

```
1. Validate required dotfiles exist
2. Compute WID via canon.sh
3. Emit trace header (HDR, BALL)
4. Evaluate execution algebra via poly.awk
5. Capture stdin
6. Execute admissible interrupts (exactly once)
7. Compute RID from trace
8. Derive E8×E8 policy (policy.sh, geometry.sh, replica.sh)
9. Append self-encoding bundle
10. Atomically publish trace
```

### Dotfiles (v2.0)

Required dotfiles in `world/`:

| Dotfile | Purpose |
|---------|---------|
| `.genesis` | Origin metadata (user, runtime) |
| `.env` | Environment constraints (stdin, stdout) |
| `.atom` | Primitive units with optional weights |
| `.manifest` | Component inventory (max_degree, max_wdegree, banned prefixes) |
| `.schema` | Trace structure specification |
| `.sequence` | Ordering constraints |
| `.include` | Interrupt allowlist |
| `.ignore` | Interrupt blocklist |
| `.procedure` | Execution envelope (polynomial domain, mode, sign, shadow) |
| `.interrupt` | Event hooks (polynomial fragments per interrupt) |
| `.view` | Observation projections |
| `.record` | Self-encoding specification |
| **`.symmetry`** | **Policy declarations (v2.0 feature)** |

The `.symmetry` file declares the algebra configuration:
- Policy family (e8xe8)
- Geometric families (C, H, O)
- Replica count
- Algebra mode (open/closed)
- Weighted atoms support
- Canonical form requirements

### Execution Algebra (poly.awk)

The polynomial algebra engine:
- Parses `.procedure` to extract the envelope polynomial (domain)
- Parses `.interrupt` to extract polynomial fragments
- Evaluates admissibility via:
  - Manifest constraints (max_degree, max_wdegree, banned prefixes)
  - Envelope containment (closed mode) or shadow matching (open mode)
  - Capacity constraint: abs(I(m)) <= abs(E(m))
  - Sign constraint checking
- Produces deterministic execution plan with BIND records

**Mode semantics**:
- `closed`: Envelope is exact - fragments must be contained in the envelope polynomial
- `open`: Envelope is a shadow - fragments match via first-atom shadow projection

### Policy Derivation (v2.0)

From RID, the system derives:

1. **E8×E8 Seeds** (policy.sh):
   ```
   E8L = sha256("E8L" || RID)
   E8R = sha256("E8R" || RID)
   ```

2. **Chirality** (ordering direction):
   ```
   chirality = (byte1(E8L) XOR byte1(E8R)) & 1
     → 0 = LEFT
     → 1 = RIGHT
   ```

3. **Geometry Selection** (geometry.sh - table-driven):
   ```
   mix = byte0(E8L) XOR byte0(E8R)
   projective ← table[mix % 4]        # C: LINE, PLANE, SPHERE, SHAPE
   causality  ← table[E8L[2] % 5]     # H: TETRA, CUBE, OCTA, DODECA, ICOSA
   incidence  ← table[E8R[2] % 5]     # O: SIMPLEX5, CELL16, CELL24, CELL120, CELL600
   ```

4. **Replica Slots** (replica.sh):
   ```
   for i in 0..8:
     slot[i] = (E8L[i]*257 + E8R[i] + i) mod geometry_size
   ```

**Critical**: No E8 lattice or cell graph is ever enumerated. All derivations are table lookups or arithmetic.

## Key Implementation Files

### Core Execution Engine
- `bin/run.sh` - Main execution engine, orchestrates all steps
- `bin/poly.awk` - Polynomial algebra processor, evaluates admissibility
- `bin/canon.sh` - Dotfile canonicalization and WID computation
- `bin/hash.sh` - Portable SHA-256 (supports sha256sum, shasum, openssl)
- `bin/self_encode.sh` - Appends self-encoding bundle to trace

### Policy Derivation (v2.0)
- `bin/policy.sh` - E8×E8 seed derivation and chirality
- `bin/geometry.sh` - Table-driven geometry selection
- `bin/replica.sh` - Deterministic replica slot generation

### Other Utilities
- `bin/proc.awk` - Legacy procedure parser (multiset validation)
- `bin/decomp.sh` - Decompile trace to readable format
- `bin/explain.sh` - Explain interrupt admissibility

### Interrupts
- `interrupts/PRINT.sh` - Example: echo stdin → stdout
- All interrupts must be executable shell scripts listed in `.include`

## Trace Format

Traces are tab-separated records with deterministic ordering:

```
HDR       version  2
HDR       entry    <procedure_name>
BALL      wid      <WID>
ALG_*     ...      # Algebra evaluation records
STDIN     n <num>  text <escaped>
CLAUSE    qid ...  intr ...
EXEC      eid ...  wid ... qid ... intr ...
STDOUT    n <num>  text <escaped>
STDERR    n <num>  text <escaped>
EXIT      intr ... code <rc>
END       ok 1

#METADATA  policy v2
POLICY    rid      <RID>
POLICY    e8l      <E8L_hex>
POLICY    e8r      <E8R_hex>
POLICY    chirality <LEFT|RIGHT>
GEOMETRY  projective <geometry>
GEOMETRY  causality  <geometry>
GEOMETRY  incidence  <geometry>
REPLICA   slots      <JSON_array>

MANIFEST  sha256 ... count ...
FILE      path ... sha256 ... mode ... bytes ...
DATA      <base64>
END_FILE  path ...
END
```

## Development Workflow

### Modifying Dotfiles

When changing world dotfiles:
1. Remember: dotfiles are identifier-only (no executable code)
2. `.procedure` and `.interrupt` use polynomial syntax (v2 format)
3. Always test determinism after changes
4. WID will change if any dotfile changes

### Adding New Interrupts

1. Create executable handler: `interrupts/NEW_INTERRUPT.sh`
2. Add to `.include`: `echo "NEW_INTERRUPT" >> world/.include`
3. Add polynomial fragment to `.interrupt`:
   ```
   interrupt NEW_INTERRUPT v2
   poly:
     +1 some_atom
   end poly
   end interrupt
   ```
4. Ensure `.procedure` domain can admit the fragment
5. Test with validation suite

### Testing Changes

```bash
# Generate trace twice
echo "test" | ./bin/run.sh world out1
echo "test" | ./bin/run.sh world out2

# Must be byte-for-byte identical
cmp out1/trace.log out2/trace.log

# Verify RIDs match
grep "^POLICY	rid" out1/trace.log
grep "^POLICY	rid" out2/trace.log
```

### Debugging Traces

```bash
# View raw trace
cat out/trace.log

# Filter by event type
awk -F '\t' '$1=="STDOUT"' out/trace.log
awk -F '\t' '$1=="EXEC"' out/trace.log
awk -F '\t' '$1=="ALG_ADMIT"' out/trace.log

# Check policy derivation
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log

# Decode base64 payloads
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d

# View self-encoding section
awk '/^MANIFEST/,/^END$/' out/trace.log
```

### Decompiling Traces

```bash
# Render trace in human-readable format
./bin/decomp.sh out/trace.log

# Explain why an interrupt was admitted/rejected
./bin/explain.sh <interrupt_name>
```

## Important Constraints

### Determinism Requirements
- **No timestamps**: Traces must not depend on wall-clock time
- **No randomness**: All execution is deterministic
- **No network literals**: IPs, ports, MACs forbidden in traces
- **Canonical sorting**: Dotfiles and polynomials must sort deterministically
- **Trace-time ordering**: Events ordered by causality, not real time

### Architectural Invariants
- Trace is immutable and append-only
- World files are non-executable (identifier-only)
- Effects happen exactly once during execution
- Policy is derived from RID (never stored in world)
- Chirality affects ordering only, never content or truth
- No E8 lattice is ever enumerated
- Transport layer is semantics-blind

### Polynomial Syntax (v2)

Procedure envelope format (`.procedure`):
```
procedure <name> v2
domain:
  <coeff> <atom> [<coeff> <atom> ...]
end domain

mode <open|closed>
sign <any|same|opposite>
max_wdegree <N>
shadow <first_atom|all_atoms|none>

end procedure
```

Interrupt fragment format (`.interrupt`):
```
interrupt <NAME> v2
poly:
  <coeff> <atom> [<coeff> <atom> ...]
end poly
end interrupt
```

Coefficients can be positive or negative integers. Atoms must be declared in `.atom`.

## Termux Compatibility

This codebase is developed on Termux (Android):
1. Use POSIX sh (#!/bin/sh, set -eu)
2. Portable stat handling in self-encoding
3. Hash tool detection (sha256sum → shasum → openssl)
4. Base64 decoding with `base64 -d`
5. No GNU-isms or bash-specific features
6. Awk scripts use manual sorting instead of asort()

## Network Layer (ulp:// Protocol)

The network implementation is in `network/ulp_peer.go`:

```bash
cd network
go build -o ulp_peer ulp_peer.go
./ulp_peer serve ../out
```

Protocol:
- Request: `ulp://<RID>`
- Response: raw record bytes (never re-executed)

Routing uses causality geometry and chirality for peer ordering.
Replication uses incidence geometry for deterministic slot assignment.

## Key Differences from v1.1

| Feature | v1.1 | v2.0 |
|---------|------|------|
| Policy | Implicit | Explicit (E8×E8) |
| Dotfiles | 12 | 13 (+.symmetry) |
| Algebra | Pattern_Syntax | Polynomial v2 |
| Metadata | None | POLICY, GEOMETRY, REPLICA |
| Network | Unspecified | ulp://<RID> |
| Chirality | None | LEFT/RIGHT |
