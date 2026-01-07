# Universal Life Protocol v2.0

## From First Principles: Dotfile-Defined, Self-Encoding, Network-Replicable

**Status**: Reference Implementation
**Spec Version**: 2.0
**Compliance**: ✓ Deterministic, ✓ Self-Encoding, ✓ Policy-Derived

---

## The Prime Rule

**If it is not expressible as a dotfile, it is not part of the system.**

All behavior, authority, symmetry, projection, routing, and replication **must be derivable from dotfiles**.

---

## Quick Start

### 1. Execute and Create a POINT (Record)

```bash
echo -e 'hello\nworld' | ./bin/run.sh world out
```

Output:
```
# Computing WID...
# WID: 6cde1b0e411dc118c6de9992b8d454a21c000d3742ed414790a585bf994daeae
# RID: cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
# Deriving policy...
# Trace written: out/trace.log
cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
```

### 2. Verify Determinism

```bash
./test_determinism.sh
```

Output:
```
=== ULP v2.0 Determinism Test ===
Run 1: Executing...
  RID: cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
Run 2: Executing...
  RID: cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
✓ RIDs match
✓ Traces are byte-for-byte identical
✓ Policy seeds deterministic
✓ Geometry selection deterministic
✓ Replica slots deterministic

=== ALL TESTS PASSED ===
```

### 3. Inspect Policy Derivation

```bash
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

Output:
```
POLICY	rid	cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
POLICY	e8l	1ac41f523a3de6c0b584e1097fb3b68e37aa512db0690c309db1f9f5d0cfbd8b
POLICY	e8r	84941434590e5a1404afc14a2123b68ec6ef42f60fd2906692cf32c965625862
POLICY	chirality	LEFT
GEOMETRY	projective	SPHERE
GEOMETRY	causality	CUBE
GEOMETRY	incidence	SIMPLEX5
REPLICA	slots	 [4, 1, 3, 3, 5, 0, 4, 3, 5]
```

---

## The Two Primitives

### 1. POINT (Record)

An immutable, content-addressed record produced by execution **exactly once**.

```
POINT ≡ sha256(record_bytes)
```

- Execution happens once
- Never re-executed by observers
- Identified by RID (Record ID)

### 2. BALL (World)

A closed interior of non-executable constraints defined by dotfiles.

```
BALL ≡ sha256(canonicalize(all_dotfiles))
```

- Identifier-only content
- Canonicalizable
- Non-executable
- Identified by WID (World ID)

---

## The Execution Rule

```
(BALL + input stream) → execute once → POINT
```

1. **BALL**: World constraints (dotfiles)
2. **Input**: stdin stream
3. **Execute**: Run interrupts through procedures **once**
4. **POINT**: Immutable trace record

---

## Dotfiles (The Only Axioms)

### Required Dotfiles (v2.0)

| Dotfile | Role | Layer |
|---------|------|-------|
| `.genesis` | Origin metadata | BALL |
| `.env` | Environment constraints | BALL |
| `.schema` | Trace structure spec | BALL |
| `.atom` | Primitive units | BALL |
| `.manifest` | Component inventory | BALL |
| `.sequence` | Ordering constraints | BALL |
| `.include` | Allowed interrupts | BALL |
| `.ignore` | Blocked interrupts | BALL |
| `.interrupt` | Event hooks | Execution |
| `.procedure` | Boundary declarations | Execution |
| `.view` | Observation projections | Projection |
| `.record` | Self-encoding spec | POINT |
| **`.symmetry`** | **Policy declarations (v2.0)** | **Policy** |

### NEW: `.symmetry` (v2.0 Feature)

Declares allowed policy space without execution:

```
symmetry v1
policy e8xe8
projective C
causality H
incidence O
replicas 9
```

This file **does not execute** anything. It declares which families of behavior are permitted.

---

## Policy Derivation (v2.0)

From a POINT (RID), the system derives:

### 1. E8×E8 Seeds

```bash
E8L = sha256("E8L" || RID)
E8R = sha256("E8R" || RID)
```

### 2. Chirality (Ordering Direction)

```bash
chirality = (byte1(E8L) XOR byte1(E8R)) & 1
  → 0 = LEFT
  → 1 = RIGHT
```

**Critical**: Chirality affects **order only**, never content or truth.

### 3. Geometry Selection (Table-Driven)

```bash
mix = byte0(E8L) XOR byte0(E8R)
projective_ladder ← table[mix % 4]   # C family: LINE, PLANE, SPHERE, SHAPE
causality_ladder  ← table[E8L[2] % 5] # H family: TETRA, CUBE, OCTA, DODECA, ICOSA
incidence_ladder  ← table[E8R[2] % 5] # O family: SIMPLEX5, CELL16, CELL24, CELL120, CELL600
```

**Critical**: No E8 lattice is enumerated. Only table lookups.

### 4. Replica Slots (Deterministic)

```bash
for i in 0..8:
  slot[i] = (E8L[i]*257 + E8R[i] + i) mod geometry_size
```

Generates exactly 9 slots per record.

---

## The Four Ladders (Explanatory)

You don't need to understand these to use ULP. They explain **why** it works.

### Ontology Ladder (ℝ - Self-Reflective)

```
POINT (Record) → axiom
BALL (World)   → constraint interior
```

- No adjacency
- No traversal
- No projection
- **Source of authority**

### Projective Ladder (ℂ - Observation / Phase)

```
LINE   → first reflection (boundary crossing)
PLANE  → contextual grouping
SPHERE → interface / observation surface
SHAPE  → projected form (non-causal)
```

- Reflection only
- No propagation
- Hopf ℂ fibration (S¹ fibers)
- **Views live here**

### Causality Ladder (ℍ - Propagation)

```
SHAPE → hinge
TETRA → 4 vertices
CUBE / OCTA → routing
DODECA / ICOSA → isotropic propagation
```

- Adjacency-based
- Routing
- Self-healing traversal
- Quaternionic orientation (S³ fibers)
- **Network routing lives here**

### Incidence Ladder (𝕆 - Coexistence)

```
SHAPE → hinge
SIMPLEX5 → 6 vertices
CELL16 / CELL24 → replica envelopes
CELL120 / CELL600 → quorum-free coexistence
```

- Higher-order relations
- Replication without consensus
- Non-associative composition (S⁷ fibers)
- **Replica slots live here**

---

## Architecture

### Directory Structure

```
ulpv2/
├── bin/               # Core utilities
│   ├── hash.sh        # SHA-256 (portable)
│   ├── canon.sh       # Dotfile canonicalization
│   ├── policy.sh      # E8×E8 seed/chirality derivation
│   ├── geometry.sh    # Table-driven geometry selection
│   ├── replica.sh     # Replica slot generation
│   ├── proc.awk       # Procedure parser (multiset validation)
│   ├── run.sh         # Main execution engine
│   └── self_encode.sh # Self-encoding bundle creator
├── interrupts/        # Executable handlers
│   └── PRINT.sh       # Example: echo stdin → stdout
├── world/             # Example world dotfiles
│   ├── .genesis
│   ├── .env
│   ├── .schema
│   ├── .atom
│   ├── .manifest
│   ├── .sequence
│   ├── .include
│   ├── .ignore
│   ├── .interrupt
│   ├── .procedure
│   ├── .view
│   ├── .record
│   └── .symmetry      # NEW in v2.0
├── network/           # libp2p implementation
│   ├── ulp_peer.go    # ULP protocol handler
│   └── go.mod
├── test_determinism.sh
└── README.md
```

### Trace Format (v2.0)

```
HDR       version  2
HDR       entry    <procedure_name>
BALL      wid      <WID>
STDIN     n <num>  text <escaped>
CLAUSE    qid ...  openSig ... closeSig ... intr ...
EXEC      eid ...  wid ... qid ... intr ...
STDOUT    n <num>  text <escaped>
STDERR    n <num>  text <escaped>
EXIT      intr ... code <rc>
END       ok 1

#METADATA policy v2
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
```

---

## Network Layer (ulp:// Protocol)

### Serving Records

```bash
cd network
go build -o ulp_peer ulp_peer.go
./ulp_peer serve ../out
```

### Protocol

```
Request:  ulp://<RID>
Response: <raw_record_bytes>
```

**Critical invariants:**
- Transport layer is semantics-blind
- Records are never re-executed
- Nodes serve raw bytes only

### Routing (Causality)

Peer ordering derived from chirality and causality geometry:
- LEFT chirality → forward order
- RIGHT chirality → reverse order
- Causality geometry determines fallback paths

### Replication (Incidence)

Replica slots are deterministic pure functions of RID:
- No voting
- No quorum agreement
- No consensus protocol
- Each node independently computes its slots

---

## Core Utilities

### hash.sh

Portable SHA-256 (works with sha256sum, shasum, or openssl):

```bash
echo "hello" | ./bin/hash.sh
# Output: 5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03
```

### canon.sh

Canonicalize world dotfiles and compute WID:

```bash
./bin/canon.sh world
# Output: 6cde1b0e411dc118c6de9992b8d454a21c000d3742ed414790a585bf994daeae
```

### policy.sh

Derive E8×E8 policy from RID:

```bash
./bin/policy.sh cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
# Output: JSON with E8L, E8R, chirality
```

### geometry.sh

Table-driven geometry selection:

```bash
./bin/geometry.sh <E8L> <E8R>
# Output: JSON with projective, causality, incidence geometries
```

### replica.sh

Generate 9 deterministic replica slots:

```bash
./bin/replica.sh <E8L> <E8R> <geometry_size>
# Output: JSON with slot indices
```

---

## Self-Encoding

Every trace contains **everything needed to recreate the system that produced it**.

### What Gets Embedded

```
WORLD/      # All dotfiles (including .symmetry)
REPO/bin/   # All utilities (*.sh, *.awk)
REPO/interrupts/  # All handlers
```

### Reconstruction (Future)

```bash
./bin/decode.sh out/trace.log /tmp/reconstructed
cd /tmp/reconstructed/REPO
echo -e 'hello\nworld' | ./bin/run.sh ../WORLD out2
# Result: byte-for-byte identical trace
```

---

## Compliance Checklist

An implementation is ULP v2.0 compliant if and only if:

- [x] Records are content-addressed (RID = sha256(bytes))
- [x] Dotfiles are identifier-only
- [x] Views are derived, not stored as truth
- [x] Chirality only affects ordering
- [x] No E8 or cell graph is enumerated
- [x] Transport layer is semantics-blind
- [x] Execution happens exactly once
- [x] Policy is derived from RID (E8L, E8R, chirality, geometry)
- [x] Replica slots are deterministic
- [x] Self-encoding is complete

---

## Testing

### Determinism Test

```bash
./test_determinism.sh
```

Verifies:
- ✓ Execution → identical RID
- ✓ Trace → byte-for-byte identical
- ✓ Policy → deterministic seeds
- ✓ Geometry → deterministic selection
- ✓ Replicas → deterministic slots

### Manual Verification

```bash
# Run twice
echo "test" | ./bin/run.sh world out1
echo "test" | ./bin/run.sh world out2

# Compare traces
cmp out1/trace.log out2/trace.log
echo $?  # Should be 0 (identical)

# Compare RIDs
grep "^POLICY	rid" out1/trace.log
grep "^POLICY	rid" out2/trace.log
# Should match exactly
```

---

## Examples

### Minimal World

```bash
mkdir -p myworld
cat > myworld/.genesis << 'EOF'
user alice
runtime posix
EOF

cat > myworld/.env << 'EOF'
stdin file
stdout file
EOF

cat > myworld/.atom << 'EOF'
atom line
EOF

cat > myworld/.symmetry << 'EOF'
symmetry v1
policy e8xe8
projective C
causality H
incidence O
replicas 9
EOF

# ... add other required dotfiles
```

### Custom Interrupt

```bash
cat > interrupts/UPPERCASE.sh << 'EOF'
#!/bin/sh
tr '[:lower:]' '[:upper:]'
EOF

chmod +x interrupts/UPPERCASE.sh

# Add to .include
echo "UPPERCASE" >> world/.include

# Add to .procedure
cat >> world/.procedure << 'EOF'
procedure transform
(([
interrupt UPPERCASE
[((
EOF

# Run
echo "hello" | ./bin/run.sh world out
```

---

## Key Differences from v1.1

| Feature | v1.1 | v2.0 |
|---------|------|------|
| Policy | Implicit | Explicit (E8×E8) |
| Chirality | None | LEFT/RIGHT ordering |
| Geometry | None | Table-driven selection |
| Replicas | None | 9 deterministic slots |
| Dotfile | 12 files | 13 files (+`.symmetry`) |
| Trace Metadata | None | POLICY, GEOMETRY, REPLICA |
| Network Protocol | Not specified | ulp://<RID> |
| Ladders | Implicit | ℝ, ℂ, ℍ, 𝕆 (explanatory) |

---

## References

- **ULP v1.1 Architecture**: `../archive/ulp/`
- **From First Principles Spec**: See normative docs
- **Symmetry & Projection Spec**: See ladder definitions
- **libp2p**: https://github.com/libp2p/go-libp2p

---

## License

Reference implementation of Universal Life Protocol v2.0.

---

## Contact

For questions, issues, or contributions, see project repository.
