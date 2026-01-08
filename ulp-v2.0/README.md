# Universal Life Protocol v2.0

> **Deterministic execution that creates self-encoding, verifiable traces from dotfile-defined worlds**

[![Status](https://img.shields.io/badge/status-reference_implementation-blue)](.)
[![Spec](https://img.shields.io/badge/spec-v2.0-green)](.)
[![Deterministic](https://img.shields.io/badge/deterministic-✓-success)](.)

## What is ULP v2.0?

ULP v2.0 is a deterministic execution protocol where:
- **BALL** (World) + **input** → **execute once** → **POINT** (Trace)
- Traces are immutable, content-addressed, and self-encoding
- Policy is derived from trace content via E8×E8 lattice projections
- Everything is defined by dotfiles - no hidden state, no configuration

**The Prime Rule**: *If it is not expressible as a dotfile, it is not part of the system.*

## Quick Start

### 1. Execute and Create a Trace

```bash
echo -e 'hello\nworld' | ./bin/run.sh world out
```

**Output:**
```
# Computing WID...
# WID: 6cde1b0e411dc118c6de9992b8d454a21c000d3742ed414790a585bf994daeae
# RID: cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
# Deriving policy...
# Trace written: out/trace.log
cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
```

**What just happened?**
1. Computed WID (World ID) from dotfiles in `world/`
2. Executed interrupts through procedure algebra
3. Created immutable trace at `out/trace.log`
4. Derived E8×E8 policy metadata (chirality, geometry, replica slots)
5. Appended self-encoding bundle
6. Returned RID (Record ID) for content addressing

### 2. Verify Determinism

```bash
./test_determinism.sh
```

**Critical invariant**: Same inputs → byte-for-byte identical traces

```
=== ULP v2.0 Determinism Test ===
✓ RIDs match
✓ Traces are byte-for-byte identical
✓ Policy seeds deterministic
✓ Geometry selection deterministic
✓ Replica slots deterministic

=== ALL TESTS PASSED ===
```

### 3. Inspect the Trace

```bash
# View the trace
cat out/trace.log

# See policy derivation
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

**Output:**
```
POLICY	rid	cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
POLICY	e8l	1ac41f523a3de6c0b584e1097fb3b68e37aa512db0690c309db1f9f5d0cfbd8b
POLICY	e8r	84941434590e5a1404afc14a2123b68ec6ef42f60fd2906692cf32c965625862
POLICY	chirality	LEFT
GEOMETRY	projective	SPHERE
GEOMETRY	causality	CUBE
GEOMETRY	incidence	SIMPLEX5
REPLICA	slots	[4, 1, 3, 3, 5, 0, 4, 3, 5]
```

## Core Concepts

### The Execution Rule

```
(BALL + input stream) → execute once → POINT
```

1. **BALL**: World constraints defined by dotfiles (non-executable, identifier-only)
2. **Input**: stdin stream
3. **Execute**: Run interrupts through procedure envelope **exactly once**
4. **POINT**: Immutable, content-addressed trace

### BALL (World)

A world is a closed interior of non-executable constraints:

```
BALL ≡ sha256(canonicalize(all_dotfiles))
```

**Properties:**
- Identifier-only content (no executable code in dotfiles)
- Canonicalizable (deterministic sorting)
- Identified by WID (World ID)

### POINT (Record)

A record is an immutable execution trace:

```
POINT ≡ sha256(trace_bytes)
```

**Properties:**
- Content-addressed
- Self-encoding (contains everything to reproduce itself)
- Execution happens exactly once
- Never re-executed by observers
- Identified by RID (Record ID)

### Policy Derivation (v2.0 Feature)

From any RID, the system **derives** (not stores):

1. **E8×E8 Seeds**:
   ```
   E8L = sha256("E8L" || RID)
   E8R = sha256("E8R" || RID)
   ```

2. **Chirality** (ordering direction):
   ```
   LEFT or RIGHT based on (E8L[1] XOR E8R[1]) & 1
   ```

3. **Geometry** (table-driven selection):
   - **Projective** (ℂ): LINE, PLANE, SPHERE, SHAPE
   - **Causality** (ℍ): TETRA, CUBE, OCTA, DODECA, ICOSA
   - **Incidence** (𝕆): SIMPLEX5, CELL16, CELL24, CELL120, CELL600

4. **Replica Slots** (9 deterministic positions)

**Critical**: No E8 lattice is ever enumerated. All derivations use table lookups.

## Directory Structure

```
ulp-v2.0/
├── bin/                    # Core execution engine
│   ├── run.sh              # Main executor
│   ├── poly.awk            # Polynomial algebra processor
│   ├── canon.sh            # Dotfile canonicalization
│   ├── policy.sh           # E8×E8 seed derivation
│   ├── geometry.sh         # Geometry table lookups
│   ├── replica.sh          # Replica slot generation
│   ├── hash.sh             # Portable SHA-256
│   └── self_encode.sh      # Self-encoding bundler
├── interrupts/             # Executable handlers
│   └── PRINT.sh            # Example interrupt
├── world/                  # Example world dotfiles
│   ├── .genesis            # Origin metadata
│   ├── .env                # Environment constraints
│   ├── .atom               # Primitive units
│   ├── .manifest           # Component inventory
│   ├── .procedure          # Execution envelope
│   ├── .interrupt          # Event hooks
│   ├── .symmetry           # Policy declarations (v2.0)
│   └── ...                 # Other dotfiles
├── network/                # libp2p protocol implementation
│   └── ulp_peer.go         # ulp:// protocol handler
├── test_determinism.sh     # Determinism test suite
└── README.md               # This file
```

## Dotfiles Reference

All worlds require these 13 dotfiles:

| Dotfile | Purpose | Example |
|---------|---------|---------|
| `.genesis` | Origin metadata | `user brian\nruntime posix` |
| `.env` | Environment constraints | `stdin file\nstdout file` |
| `.atom` | Primitive units | `atom line weight 1` |
| `.manifest` | Component constraints | `max_degree 3\nmax_wdegree 3` |
| `.schema` | Trace structure spec | `version 2` |
| `.sequence` | Ordering constraints | (ordering rules) |
| `.include` | Allowed interrupts | `PRINT` |
| `.ignore` | Blocked interrupts | (empty or blocklist) |
| `.procedure` | Execution envelope | `domain:\n  +1 line\nend domain` |
| `.interrupt` | Event hooks | `interrupt PRINT v2\npoly:\n  +1 line` |
| `.view` | Observation projections | (view declarations) |
| `.record` | Self-encoding spec | (bundle specification) |
| **`.symmetry`** | **Policy declarations** | `policy e8xe8` **(v2.0)** |

## Common Commands

### Execution

```bash
# Execute with default entry procedure
echo -e 'hello\nworld' | ./bin/run.sh world out

# Execute with specific procedure
echo -e 'test' | ./bin/run.sh world out my_procedure
```

### Testing

```bash
# Run full determinism test
./test_determinism.sh

# Manual verification
echo "test" | ./bin/run.sh world out1
echo "test" | ./bin/run.sh world out2
cmp out1/trace.log out2/trace.log  # Should be identical
```

### Debugging

```bash
# View raw trace
cat out/trace.log

# Filter execution events
awk -F '\t' '$1=="EXEC"' out/trace.log

# Check algebra evaluation
awk -F '\t' '$1 ~ /^ALG_/' out/trace.log

# View stdout/stderr
awk -F '\t' '$1=="STDOUT" {print $5}' out/trace.log
awk -F '\t' '$1=="STDERR" {print $5}' out/trace.log

# Inspect policy metadata
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log

# Decode self-encoding bundle
awk '/^MANIFEST/,/^END$/' out/trace.log
```

### Utilities

```bash
# Compute WID from world
./bin/canon.sh world

# Derive policy from RID
./bin/policy.sh <RID>

# Get geometry for E8L/E8R seeds
./bin/geometry.sh <E8L> <E8R>

# Calculate replica slots
./bin/replica.sh <E8L> <E8R> <geometry_size>

# Hash anything
echo "hello" | ./bin/hash.sh
```

## Creating a Custom World

### 1. Create World Directory

```bash
mkdir -p myworld
```

### 2. Define Origin

```bash
cat > myworld/.genesis << 'EOF'
user alice
runtime posix
EOF
```

### 3. Set Environment

```bash
cat > myworld/.env << 'EOF'
stdin file
stdout file
EOF
```

### 4. Declare Atoms

```bash
cat > myworld/.atom << 'EOF'
atom line weight 1
atom word weight 2
EOF
```

### 5. Set Constraints

```bash
cat > myworld/.manifest << 'EOF'
manifest v2

max_degree 3
max_wdegree 5
EOF
```

### 6. Define Procedure Envelope

```bash
cat > myworld/.procedure << 'EOF'
procedure process v2
domain:
  +1 line
  +2 word
end domain

mode open
sign same
max_wdegree 5
shadow first_atom

end procedure
EOF
```

### 7. Create Interrupt

```bash
cat > interrupts/PROCESS.sh << 'EOF'
#!/bin/sh
# Custom interrupt handler
cat
EOF

chmod +x interrupts/PROCESS.sh
```

### 8. Register Interrupt

```bash
cat > myworld/.interrupt << 'EOF'
on_start process

interrupt PROCESS v2
poly:
  +1 line
end poly
end interrupt
EOF
```

```bash
echo "PROCESS" > myworld/.include
touch myworld/.ignore
```

### 9. Add Required Files

```bash
cat > myworld/.schema << 'EOF'
version 2
EOF

cat > myworld/.sequence << 'EOF'
EOF

cat > myworld/.view << 'EOF'
EOF

cat > myworld/.record << 'EOF'
EOF

cat > myworld/.symmetry << 'EOF'
symmetry v2
policy e8xe8
projective C
causality H
incidence O
replicas 9
algebra:
    mode open
    weighted_atoms yes
    canonical_form yes
end algebra
end symmetry
EOF
```

### 10. Execute

```bash
echo -e 'hello\nworld' | ./bin/run.sh myworld out
```

## Network Protocol (ulp://)

### Start P2P Server

```bash
cd network
go build -o ulp_peer ulp_peer.go
./ulp_peer serve ../out
```

### Protocol

- **Request**: `ulp://<RID>`
- **Response**: Raw trace bytes (never re-executed)

**Transport properties:**
- Semantics-blind
- Content-addressed routing
- Deterministic peer ordering via chirality
- Deterministic replication via replica slots

## Key Invariants

### Determinism
- ✓ No timestamps
- ✓ No randomness
- ✓ No network literals (IPs, MACs, ports)
- ✓ Canonical sorting
- ✓ Trace-time ordering only

### Architecture
- ✓ Trace is immutable and append-only
- ✓ World files are non-executable
- ✓ Execution happens exactly once
- ✓ Policy is derived, never stored
- ✓ Chirality affects ordering only, never content
- ✓ No E8 lattice enumeration
- ✓ Transport is semantics-blind

## Trace Format

Traces are tab-separated records:

```
HDR       version  2
HDR       entry    <procedure>
BALL      wid      <WID>
ALG_*     ...      # Algebra evaluation
STDIN     n <num>  text <escaped>
CLAUSE    qid ...  intr ...
EXEC      eid ...  wid ... qid ... intr ...
STDOUT    n <num>  text <escaped>
STDERR    n <num>  text <escaped>
EXIT      intr ... code <rc>
END       ok 1

#METADATA  policy v2
POLICY    rid      <RID>
POLICY    e8l      <E8L>
POLICY    e8r      <E8R>
POLICY    chirality <LEFT|RIGHT>
GEOMETRY  projective <geometry>
GEOMETRY  causality  <geometry>
GEOMETRY  incidence  <geometry>
REPLICA   slots      <array>

MANIFEST  sha256 ... count ...
FILE      path ... sha256 ... bytes ...
DATA      <base64>
END_FILE  path ...
END
```

## What's New in v2.0

| Feature | v1.1 | v2.0 |
|---------|------|------|
| Policy | Implicit | Explicit E8×E8 derivation |
| Chirality | None | LEFT/RIGHT ordering |
| Geometry | None | Table-driven (C/H/O families) |
| Replicas | None | 9 deterministic slots |
| Dotfiles | 12 | 13 (+`.symmetry`) |
| Algebra | Pattern_Syntax | Polynomial v2 |
| Metadata | None | POLICY, GEOMETRY, REPLICA |
| Network | Unspecified | `ulp://<RID>` protocol |

## Platform Notes

Developed on **Termux (Android)** with POSIX compatibility:
- Uses `#!/bin/sh` (not bash)
- Portable SHA-256 (sha256sum → shasum → openssl)
- Manual sorting in awk (no asort)
- Portable stat handling
- No GNU-specific features

## Learn More

- **CLAUDE.md** - Development guide for working with this codebase
- **Execution Flow** - See `bin/run.sh` for complete execution pipeline
- **Algebra System** - See `bin/poly.awk` for polynomial evaluation
- **Policy Derivation** - See `bin/policy.sh`, `bin/geometry.sh`, `bin/replica.sh`

## License

Reference implementation of Universal Life Protocol v2.0.

---

**The trace is the machine. Everything else is a view.**
