# Universal Life Protocol v2.0 Specification

**Version**: 2.0
**Status**: Frozen
**Date**: 2026-01-02
**Authority**: This document is normative for ULP v2.0 compliance
**Supersedes**: ULP v1.1 (archive/ulp/)

---

## 0. Document Structure

This specification is organized in dependency order:
1. **Core Invariants** (non-negotiable constraints)
2. **Fundamental Entities** (POINT, BALL, identifiers)
3. **Execution Model** (BALL + input → POINT)
4. **Policy System** (E8×E8 derivation)
5. **Network Protocol** (ulp:// transport)
6. **Compliance** (validation rules)

**Normative Language**: MUST, MUST NOT, SHOULD, MAY per RFC 2119.

---

## 1. Core Invariants

These invariants are **frozen** and MUST NOT be violated:

### 1.1 Execution Happens Exactly Once

A POINT (record) is created by executing a BALL (world) with an input stream **exactly once**. Network nodes, observers, and projections MUST NOT re-execute a POINT.

### 1.2 Records Are Authoritative

The trace (POINT) is ground truth. All views, projections, and observations are **derived** from the trace, never stored as truth.

### 1.3 Views Are Projections, Never Truth

Projections MAY be lossy, phase-shifted, or context-dependent. They are pure functions of the trace and MUST NOT mutate it.

### 1.4 Network Transport MUST NOT Interpret Semantics

The `ulp://` protocol serves raw record bytes. Nodes MUST NOT parse, interpret, or validate semantic content during transport.

### 1.5 Chirality Changes Ordering Only

Policy-derived chirality (LEFT/RIGHT) MAY affect the **order** of operations (routing, slot assignment) but MUST NOT affect **content** or adjacency.

### 1.6 High Symmetry MUST NOT Be Enumerated

E8×E8 lattices, Hopf fibrations, and cell graphs are **explanatory tools**. Implementations MUST use table-driven derivation, never runtime enumeration.

---

## 2. Fundamental Entities

### 2.1 Identifiers

All identifiers are content-addressed SHA-256 hashes:

```
RID := sha256(record_bytes)          # Record ID (POINT)
WID := sha256(canonicalize(dotfiles)) # World ID (BALL)
QID := sha256(openSig || interrupt || closeSig) # Clause ID
EID := sha256(WID || QID || interrupt)          # Execution ID
```

Implementations MUST use SHA-256 (32 bytes / 256 bits).

### 2.2 POINT (Record)

A POINT is an immutable, append-only trace.

**Structure:**
```
Record:
  rid   : RID
  bytes : opaque byte stream
  bundle: embedded self-encoding (optional but recommended)
```

**Rules:**
1. `sha256(bytes) == rid` MUST hold
2. A POINT MUST NOT be re-executed by observers
3. A POINT SHOULD include a self-encoding bundle

### 2.3 BALL (World)

A BALL is a non-executable constraint interior defined by dotfiles.

**Structure:**
```
WorldBall:
  wid      : WID
  dotfiles : map[filename]bytes
```

**Required Dotfiles (v2.0):**
```
.genesis .env .schema .atom .manifest .sequence
.include .ignore .interrupt .procedure .view .record
.symmetry     # NEW in v2.0
```

**Rules:**
1. Dotfiles MUST be identifier-only (no control flow, no execution)
2. Special case: `.procedure` MAY contain Pattern_Syntax delimiters
3. Canonicalization MUST be stable and deterministic
4. `sha256(canonicalize(dotfiles)) == wid` MUST hold

---

## 3. Execution Model

### 3.1 The Execution Rule

```
(BALL + input_stream) → execute_once → POINT
```

**Steps:**
1. Load BALL (world dotfiles)
2. Compute WID
3. Read input stream
4. Parse `.procedure` (multiset-validated)
5. Execute interrupts **once** per clause
6. Record STDIN, EXEC, STDOUT, STDERR, EXIT events
7. Append END marker
8. Compute RID
9. Derive policy (E8L, E8R, chirality, geometry, slots)
10. Append policy metadata
11. Append self-encoding bundle
12. Publish POINT

### 3.2 Dotfile Roles

| Dotfile | Layer | Purpose |
|---------|-------|---------|
| `.genesis` | BALL | Origin metadata (author, runtime) |
| `.env` | BALL | Environment constraints (stdin, stdout types) |
| `.schema` | BALL | Trace structure specification |
| `.atom` | BALL | Primitive units (e.g., "line") |
| `.manifest` | BALL | Component inventory |
| `.sequence` | BALL | Ordering constraints |
| `.include` | BALL | Allowed interrupt names (allowlist) |
| `.ignore` | BALL | Blocked interrupt names (blocklist) |
| `.interrupt` | Execution | Event hooks (on_start, interrupt NAME) |
| `.procedure` | Execution | Boundary declarations with Pattern_Syntax |
| `.view` | Projection | Observation specifications |
| `.record` | POINT | Self-encoding metadata |
| `.symmetry` | Policy | Policy family declarations (v2.0) |

### 3.3 Pattern_Syntax and Multiset Validation

The `.procedure` file uses delimiter-based scoping:

```
procedure <name>
<openSig>
interrupt <INTERRUPT>
<closeSig>
```

**Multiset Rule:**
`multiset(openSig) == multiset(closeSig)` MUST hold.

**Example:**
```
procedure render_lines
(([
interrupt PRINT
[((
```

Validation: `{(, (, [}` == `{[, (, (}` ✓

**Implementation:**
Parsers MUST extract delimiter characters and sort them for order-insensitive comparison.

### 3.4 Interrupt Handlers

Interrupts are **executable units** bound to shell scripts:

**Rules:**
1. Handlers MUST be listed in `.include` to be allowed
2. Handlers MAY be blocked by `.ignore`
3. Handlers MAY read stdin
4. Handlers MAY write stdout/stderr
5. Handlers MUST NOT mutate dotfiles
6. Handlers MUST NOT persist state

**Example:**
```bash
#!/bin/sh
# interrupts/PRINT.sh
cat  # Echo stdin to stdout
```

---

## 4. Policy System (v2.0)

### 4.1 The `.symmetry` Dotfile

**Format:**
```
symmetry v1
policy e8xe8
projective C
causality H
incidence O
replicas 9
```

**Rules:**
1. Identifier-only (no execution)
2. Declares allowed policy **families**, not specific values
3. Included in WID computation

### 4.2 E8×E8 Seed Derivation

From a POINT (RID), derive two seeds:

```
E8L = sha256("E8L" || RID)  # Interior/self-reflection bias
E8R = sha256("E8R" || RID)  # Boundary/observation bias
```

**Rules:**
1. Seeds MUST be derived, never stored
2. Derivation MUST be deterministic
3. Concatenation is string-based: `"E8L" + hex(RID)`

### 4.3 Chirality Derivation

```
chi = (byte₁(E8L) XOR byte₁(E8R)) & 1

chi == 0 → LEFT
chi == 1 → RIGHT
```

**Rules:**
1. Chirality MUST affect ordering only
2. Chirality MUST NOT affect adjacency or content
3. LEFT and RIGHT are semantically equivalent for truth

### 4.4 Geometry Selection (Table-Driven)

```
mix = byte₀(E8L) XOR byte₀(E8R)

Projective (ℂ family):
  choices = [LINE, PLANE, SPHERE, SHAPE]
  index = mix % 4
  selected = choices[index]

Causality (ℍ family):
  choices = [TETRA, CUBE, OCTA, DODECA, ICOSA]
  index = byte₂(E8L) % 5
  selected = choices[index]

Incidence (𝕆 family):
  choices = [SIMPLEX5, CELL16, CELL24, CELL120, CELL600]
  index = byte₂(E8R) % 5
  selected = choices[index]
```

**Rules:**
1. Selection MUST be table-driven (no lattice enumeration)
2. Tables MUST be constant and implementation-defined
3. Geometry names are symbolic identifiers, not executable code

### 4.5 Replica Slot Generation

```
for i in 0..8:
  slot[i] = (byte(E8L, i)*257 + byte(E8R, i) + i) mod N
```

Where:
- N = size of selected incidence geometry
- Slot count MUST be exactly 9
- Slots MAY repeat (no uniqueness constraint)

**Rules:**
1. Slots MUST be deterministic pure functions of RID
2. No voting, quorum, or consensus protocol
3. Slots are **intent**, not enforcement

---

## 5. The Four Ladders (Explanatory)

These are **not required for implementation** but explain why the system works.

### 5.1 Ontology Ladder (ℝ)

```
POINT → axiom (execution result)
BALL  → constraint interior (world)
```

**Properties:**
- No adjacency
- No traversal
- No projection
- **Source of authority**

### 5.2 Projective Ladder (ℂ)

```
LINE   → first reflection (boundary crossing)
PLANE  → contextual grouping
SPHERE → interface / observation surface
SHAPE  → projected form (hinge)
```

**Properties:**
- Reflection only (no propagation)
- Hopf ℂ fibration (S¹ fibers)
- Views are phase-based observations

### 5.3 Causality Ladder (ℍ)

```
SHAPE       → hinge
TETRA       → 4 vertices
CUBE/OCTA   → 8/6 vertices
DODECA/ICOSA → 20/12 vertices
```

**Properties:**
- Adjacency-based routing
- Self-healing traversal
- Quaternionic orientation (S³ fibers)

### 5.4 Incidence Ladder (𝕆)

```
SHAPE        → hinge
SIMPLEX5     → 6 vertices
CELL16/CELL24 → 16/24 cells
CELL120/CELL600 → 120/600 cells
```

**Properties:**
- Higher-order coexistence relations
- Replication without consensus
- Non-associative composition (S⁷ fibers)

### 5.5 SHAPE (Junction Type)

SHAPE is a **hinge**, not a geometry.

It MAY refine into:
- A CausalShape (propagation via ℍ)
- An IncidenceShape (coexistence via 𝕆)

SHAPE MUST NOT imply semantics by itself.

---

## 6. Network Protocol

### 6.1 The `ulp://` URL Scheme

```
ulp://<RID>
```

Where `<RID>` is a 64-character hex-encoded SHA-256 hash.

**Example:**
```
ulp://cbc3673fa91e5851fe51a0be44cb1b53c46da6db34dd5decf68276603b104e55
```

### 6.2 Protocol Semantics

**Request:**
```
GET ulp://<RID>
```

**Response:**
```
<raw_record_bytes>
```

**Error Responses:**
- `NOT_FOUND` - RID not available on this peer
- `ERROR: <message>` - Malformed request

**Rules:**
1. Transport MUST be semantics-blind
2. Nodes MUST serve raw bytes only
3. Nodes MUST NOT parse or validate semantic content
4. Nodes MUST NOT re-execute records

### 6.3 Routing (Causality-Based)

When multiple peers are available:

```
peers = [peer₁, peer₂, ..., peerₙ]
ordered_peers = apply_chirality(peers, chirality)

if chirality == RIGHT:
  reverse(ordered_peers)
```

**Rules:**
1. Chirality affects order, not selection
2. Failures fall through deterministically
3. No global coordination required

### 6.4 Replication (Intent-Based)

Each peer independently computes replica slots:

```
slots = generate_replica_slots(RID)
if my_index in slots:
  announce_intent_to_hold(RID)
```

**Rules:**
1. No voting or quorum
2. Peers MAY cache or drop records freely
3. Slots are **intent**, not enforcement
4. No chain reorganization

---

## 7. Trace Format (v2.0)

### 7.1 Execution Records

```
HDR     version  2
HDR     entry    <procedure_name>
BALL    wid      <WID>
STDIN   n <num>  text <escaped_text>
CLAUSE  qid ...  openSig ... closeSig ... intr ...
EXEC    eid ...  wid ... qid ... intr ...
STDOUT  n <num>  text <escaped_text>
STDERR  n <num>  text <escaped_text>
EXIT    intr ... code <rc>
END     ok 1
```

### 7.2 Policy Metadata (v2.0)

```
#METADATA policy v2
POLICY   rid       <RID>
POLICY   e8l       <E8L_hex>
POLICY   e8r       <E8R_hex>
POLICY   chirality <LEFT|RIGHT>
GEOMETRY projective <geometry>
GEOMETRY causality  <geometry>
GEOMETRY incidence  <geometry>
REPLICA  slots      <JSON_array>
```

### 7.3 Self-Encoding Bundle

```
MANIFEST sha256 <hash> count <n>
FILE     path <vpath> sha256 <hash> mode <mode> bytes <n>
DATA     <base64_line>
...
END_FILE path <vpath>
```

**Virtual Paths:**
- `WORLD/<dotfile>` - World dotfiles
- `REPO/bin/<script>` - Execution utilities
- `REPO/interrupts/<handler>` - Interrupt handlers

---

## 8. Self-Encoding

### 8.1 Purpose

Every trace SHOULD contain everything needed to recreate the system that produced it.

### 8.2 Included Files

Per `.record` specification, the bundle SHOULD include:
- All world dotfiles (WORLD/)
- All execution utilities (REPO/bin/)
- All interrupt handlers (REPO/interrupts/)

### 8.3 Reconstruction

From a self-encoded trace:

```bash
decode_trace(trace) → {WORLD/, REPO/}
cd REPO
echo "input" | ./bin/run.sh ../WORLD out
# Result: byte-for-byte identical trace
```

---

## 9. Compliance Checklist

An implementation is **ULP v2.0 compliant** if and only if ALL of the following hold:

- [ ] Records are content-addressed (RID = sha256(bytes))
- [ ] Dotfiles are identifier-only (except `.procedure` Pattern_Syntax)
- [ ] Execution happens exactly once per POINT
- [ ] Views are derived, never stored as truth
- [ ] Chirality only affects ordering, never content
- [ ] E8×E8 policy uses table lookups, never enumeration
- [ ] Transport layer is semantics-blind
- [ ] Traces are deterministic (same input → identical trace)
- [ ] Policy derivation is deterministic (E8L, E8R, chirality, geometry, slots)
- [ ] Replica slots are intent-based (no consensus)
- [ ] Self-encoding bundle is complete (world + runner + interrupts)
- [ ] `.symmetry` dotfile exists and is included in WID

---

## 10. Determinism Requirements

### 10.1 Trace Determinism

Same inputs MUST produce byte-for-byte identical traces:

```
input₁ == input₂
BALL₁ == BALL₂
  ⟹ trace₁ == trace₂  (byte-for-byte)
  ⟹ RID₁ == RID₂
```

### 10.2 Policy Determinism

Same RID MUST produce identical policy:

```
RID₁ == RID₂
  ⟹ E8L₁ == E8L₂
  ⟹ E8R₁ == E8R₂
  ⟹ chirality₁ == chirality₂
  ⟹ geometry₁ == geometry₂
  ⟹ slots₁ == slots₂
```

### 10.3 Testing Determinism

Implementations MUST provide a test that verifies:
1. Multiple executions produce identical RIDs
2. Traces are byte-for-byte identical
3. Policy metadata matches exactly

---

## 11. Breaking Changes from v1.1

### 11.1 Added

- `.symmetry` dotfile (required)
- E8×E8 policy derivation (E8L, E8R, chirality)
- Geometry selection (projective, causality, incidence)
- Replica slot generation (9 deterministic slots)
- Policy metadata in traces (POLICY, GEOMETRY, REPLICA records)
- `ulp://` network protocol specification
- Four-ladder explanatory framework (ℝ, ℂ, ℍ, 𝕆)

### 11.2 Changed

- Trace version: `1` → `2`
- Required dotfile count: `12` → `13`
- WID computation includes `.symmetry`

### 11.3 Preserved (Backward Compatible)

- Core execution model (BALL + input → POINT)
- Pattern_Syntax multiset validation
- Self-encoding mechanism
- Identifier-only dotfile constraint
- Determinism guarantee

---

## 12. Migration from v1.1 to v2.0

### 12.1 Required Changes

1. Add `.symmetry` dotfile to world/
2. Update runner to compute policy metadata
3. Append policy records to trace
4. Update trace version to 2

### 12.2 Optional Changes

1. Implement `ulp://` network protocol
2. Add causality-based routing
3. Add replica slot announcement

### 12.3 Compatibility

v1.1 traces are **not directly compatible** with v2.0 due to:
- Different WID (includes `.symmetry`)
- Different RID (includes policy metadata)
- Different trace structure

---

## 13. Reference Implementation

Location: `ulpv2/`

**Core Files:**
- `bin/run.sh` - Main execution engine
- `bin/policy.sh` - E8×E8 derivation
- `bin/geometry.sh` - Table-driven selection
- `bin/replica.sh` - Slot generation
- `network/ulp_peer.go` - libp2p protocol handler

**Testing:**
- `test_determinism.sh` - Compliance verification

---

## 14. Normative Statement

> **POINT and BALL define truth.**
> **LINE, PLANE, and SPHERE define appearance.**
> **SHAPE is the hinge.**
> **Causality propagates.**
> **Incidence coexists.**
> **E8×E8 selects without executing.**

---

## 15. Specification Hash

```
SHA256: [to be computed after finalization]
```

This hash represents the frozen v2.0 specification. Changes that alter this hash constitute a breaking version (v3.0).

---

**END OF SPECIFICATION**
