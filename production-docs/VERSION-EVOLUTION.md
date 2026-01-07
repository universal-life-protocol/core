# ULP Version Evolution: Transitions and Propagation

**Understanding how v1.1 → v2.0 → v3.0 relate, differ, and build upon each other**

---

## Overview: Three Implementations, One Vision

ULP has three **parallel implementations** representing an **evolving specification**, not a linear code inheritance:

- **v1.1**: Foundation sealed in concrete
- **v2.0**: Foundation + network layer
- **v3.0**: Foundation + formalized algebra

Think of them as **three branches from a common trunk**, not steps on a ladder.

---

## The Common Foundation (Preserved Across All Versions)

These core concepts appear in **all three versions** and are considered immutable:

### 1. Execution = Trace Construction
```
(World Definition + Input Stream) → Trace Record
```
- Not "program runs and maybe logs"
- Not "state machine with optional audit"
- **The trace IS the execution**, not a byproduct

### 2. Determinism is Non-Negotiable
- Same inputs + same world → byte-identical traces
- No timestamps, no randomness, no wall-clock dependence
- Trace-time ordering only (causal, not chronological)

### 3. Self-Encoding
- Every trace contains:
  - Execution records (what happened)
  - World definition (WORLD/ virtual path)
  - Execution tools (REPO/ virtual path)
- Anyone can reconstruct the program from the trace
- Reconstructed program produces identical trace

### 4. Dotfiles as Authority
- `.genesis`, `.env`, `.atom`, `.manifest`, `.schema`, `.sequence`
- `.include`, `.ignore`, `.procedure`, `.interrupt`
- World files are **non-executable** (identifier-only)
- No control flow in dotfiles themselves

### 5. Projections are Pure
- Views are read-only functions of traces
- No exec/eval/system calls
- No I/O or side effects
- Cannot affect execution truth

---

## Version 1.1: The Sealed Foundation

**Status**: SEALED (Architecture Hash: `9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd`)

**Date**: 2025-12-31

**Philosophy**: "Freeze the principles, allow implementation improvements"

### The Five Immutable Principles

1. **Trace is Append-Only and Authoritative**
2. **World Definition is Non-Executable**
3. **Projections are Pure Functions**
4. **Effects are Forward-Only via .interpose**
5. **Information Flows Forward-Only**

### Key Technical Features

**Pattern_Syntax with Multiset Validation**:
```
procedure render_lines
(([
interrupt PRINT
[((
```
- Opening delimiters: `(([` = multiset {`(`, `(`, `[`}
- Closing delimiters: `[((` = multiset {`(`, `(`, `[`}
- Must match as multisets (order-insensitive)
- Validated by `bin/proc.awk`

**Closed Vocabulary Sets**:
- 13 world file types (frozen)
- 16 trace event types (frozen)
- 13 effect symbols (closed algebra)

**Tools**:
- `bin/run.sh` - Main execution engine
- `bin/proc.awk` - Pattern_Syntax parser
- `bin/canon.awk` - Identifier-only canonicalization
- `bin/decode_trace.sh` - Trace reconstruction
- `bin/observe.sh` - Projection viewer
- `bin/hash.sh` - Portable SHA-256

### What Cannot Change in v1.1

- The five principles
- Closed vocabularies (must remain as-is)
- Pattern_Syntax semantics
- Trace format for core events
- World file meanings

### What Can Change in v1.1

- Bug fixes (preserving semantics)
- Performance optimizations
- New projection implementations
- Better tooling and documentation
- Additional validation checks

---

## Version 2.0: Network and Symmetry

**Status**: Reference Implementation (Supersedes v1.1)

**Date**: 2026-01-02

**Philosophy**: "Add geometric routing and network transport"

### What v2.0 Adds

#### 1. BALL/POINT Formal Terminology

**BALL (World)**:
- Non-executable constraint interior
- `WID = sha256(canonicalized_dotfiles)`
- Defines what CAN happen, not what DOES happen

**POINT (Record)**:
- Immutable trace of one execution
- `RID = sha256(trace_bytes)`
- Result of executing a BALL with input

**Relationship**: `(BALL + input) → POINT`

#### 2. E8×E8 Policy Derivation

**Seeds from RID**:
```bash
E8L = sha256("E8L" || RID)
E8R = sha256("E8R" || RID)
```

**Derived Metadata** (non-authoritative):
- **Chirality**: LEFT or RIGHT (from `byte1(E8L) XOR byte1(E8R)`)
- **Geometry**: Projective space (SPHERE, CUBE, SIMPLEX5, etc.)
- **Replica Slots**: 9 deterministic slots for replication

**Trace Records**:
```
POLICY    rid    <RID>
POLICY    e8l    <E8L>
POLICY    e8r    <E8R>
POLICY    chirality    LEFT|RIGHT
GEOMETRY  projective    <space>
GEOMETRY  causality     <structure>
GEOMETRY  incidence     <polytope>
REPLICA   slots    [s0, s1, s2, s3, s4, s5, s6, s7, s8]
```

**Key Constraint**: Policy affects **ordering** only, never **content** or **adjacency**

#### 3. Network Protocol (`ulp://`)

**Purpose**: Semantic-agnostic transport of raw record bytes

**Rules**:
- Nodes MUST NOT parse/interpret semantic content during transport
- No re-execution (POINT is created exactly once)
- Content-addressed by RID
- Replication to 9 deterministic slots

**Applications** (now in `apps/`):
- `apps/p2p-server/` - PWA + WebRTC
- `apps/p2p-server-node/` - Node.js signaling server
- `apps/ulp-sdk/` - JavaScript SDK

#### 4. New Dotfile: `.interface`

**Purpose**: Optional projection-only interface definitions

**Rules**:
- Does NOT affect execution (projection-only)
- Not included in WID calculation
- Used by observers, not executors

### What v2.0 Preserves from v1.1

✓ The five immutable principles (unchanged)
✓ Dotfile-defined worlds (same structure)
✓ Interrupt handlers (same mechanism)
✓ Self-encoding (same approach)
✓ Determinism guarantees (same requirements)

### What v2.0 Changes from v1.1

**Terminology**:
- World → BALL
- Trace → POINT
- (Conceptual clarity, not semantic change)

**Trace Format**:
- Adds `BALL` event (replaces `WORLD`)
- Adds `POLICY`, `GEOMETRY`, `REPLICA` events
- Core events remain compatible

**Scope**:
- Adds network layer (absent in v1.1)
- Adds geometric routing (new concept)
- Adds replication strategy (deterministic slots)

### How Changes Propagate: v1.1 → v2.0

**Preserved** (flows forward):
```
v1.1 Principles
    ↓
v2.0 Core Invariants (Section 1.1-1.6)
```

**Extended** (additive):
```
v1.1 Dotfiles
    ↓
v2.0 Dotfiles + .interface
```

**Added** (new layer):
```
v1.1 Execution → Trace
    ↓
v2.0 Execution → Trace → Policy Derivation → Network Transport
```

**Compatibility**:
- v1.1 traces are valid in v2.0 context (missing policy is OK)
- v2.0 traces are superset of v1.1 (extra metadata ignored if needed)
- v1.1 execution model is **unchanged** in v2.0

---

## Version 3.0: Formalized Algebra

**Status**: Platform-Agnostic POSIX/awk Core

**Date**: 2026-01-05+

**Philosophy**: "Formalize the execution algebra and canonicalize for WID determinism"

### What v3.0 Adds

#### 1. Canonical Polynomial Normal Form (CPNF)

**Problem in v1.1/v2.0**:
- `.procedure` and `.interrupt` could have equivalent but textually different representations
- Non-deterministic WID hashing if not carefully ordered

**Solution in v3.0**:
```
CPNF Rules:
1. Combine like monomials (sum coefficients)
2. Drop zero coefficients
3. Order by: (a) monomial length ascending, (b) lexicographic
4. Serialize as: ±c monomial
```

**Example**:
```
Input:
  +2 a.b.c
  -1 a.b.c
  +1 d

CPNF:
  +1 d
  +1 a.b.c
```

**Impact**: WID is now **guaranteed deterministic** regardless of source formatting

#### 2. Execution Algebra

**Atoms with Weights**:
```
.atom:
  atom line weight 1
  atom char weight 0.1
```

**Monomials**:
- Ordered sequences: `line.char.char` has weight-degree = 1.2

**Envelope (`.procedure`)**:
```
.procedure:
  +3 line.char
  -1 line.line
  max_wdegree 5
  mode open
  sign same
  shadow longest_prefix
```

**Fragments (`.interrupt`)**:
```
.interrupt:
  interrupt PRINT
    +1 line.char
  interrupt UPPERCASE
    +1 line.char
    +1 char.char
```

**Admissibility Rules**:
1. Atoms in fragment must be declared in `.atom`
2. Manifest constraints must pass
3. **Closed mode**: Fragment monomials must exist in envelope
4. **Open mode**: Fragment monomials match via shadow (first_atom or longest_prefix)
5. Capacity: `abs(fragment(m)) <= abs(envelope(m))`
6. Sign: If `sign=same`, signs must match

**New Records**:
```
ALG_ATOM      atom <name> weight <w>
ALG_ENVELOPE  mode <open|closed> sign <same|any> max_wdegree <n>
ALG_SHADOW    strategy <first_atom|longest_prefix>
ALG_FRAGMENT  interrupt <name> monomial <m> coeff <c>
ALG_ADMIT     interrupt <name> monomial <m> reason <...>
ALG_REJECT    interrupt <name> monomial <m> reason <...>
```

#### 3. View Model Renderer

**New Tool**: `bin/view_model.sh`

**Purpose**: Reference implementation of view specification contract

**Usage**:
```bash
sh ./bin/view_model.sh \
  examples/quadrants-octree.view \
  examples/trace-quadrants.json \
  /tmp/view-model.json
```

**Contract**: Views are pure functions `(Trace, ViewSpec) → ViewModel`

#### 4. Conformance Suite

**New Tool**: `test_conformance.sh`

**Tests**:
- CPNF canonicalization stability
- Execution algebra evaluation
- Admissibility first-failure-wins
- WID determinism across runs
- View model rendering

#### 5. New Dotfile: `.symmetry`

**Purpose**: Declare symmetry properties (v3 extension)

**Usage**: Metadata for geometric interpretations (non-authoritative)

### What v3.0 Preserves from v1.1 and v2.0

✓ The five immutable principles (unchanged)
✓ Dotfile structure (same set, formalized)
✓ BALL/POINT terminology (from v2.0)
✓ Policy/Geometry/Replica derivation (from v2.0)
✓ Self-encoding (same mechanism)
✓ Determinism (now stronger with CPNF)

### What v3.0 Changes from v2.0

**Canonicalization**:
- v2.0: Manual ordering of `.procedure`/`.interrupt`
- v3.0: **Mandatory CPNF** via `bin/canon.sh`

**Execution Model**:
- v2.0: Interrupt admission via `.include`/`.ignore`
- v3.0: **Algebraic admissibility** via envelope/fragment matching

**Implementation**:
- v2.0: Includes P2P server and SDK
- v3.0: **Pure POSIX/awk core**, apps moved to `apps/`

**Trace Records**:
- Adds `ALG_*` records for algebra evaluation
- Preserves `POLICY`/`GEOMETRY`/`REPLICA` from v2.0

### What v3.0 Excludes

**Intentionally omitted** (moved to `apps/`):
- P2P servers (now `apps/p2p-server/`, `apps/p2p-server-node/`)
- SDK (now `apps/ulp-sdk/`)
- Network protocol implementation

**Rationale**: Keep core platform-agnostic, applications separate

### How Changes Propagate: v2.0 → v3.0

**Formalized** (precision upgrade):
```
v2.0 .procedure (Pattern_Syntax)
    ↓
v3.0 .procedure (CPNF polynomial)
```

**Preserved** (flows forward):
```
v2.0 Policy/Geometry/Replica
    ↓
v3.0 Policy/Geometry/Replica (unchanged)
```

**Refined** (implementation detail):
```
v2.0 WID = sha256(dotfiles)
    ↓
v3.0 WID = sha256(CPNF_canonicalized(dotfiles))
```

**Extracted** (architectural separation):
```
v2.0 Monolithic (core + P2P + SDK)
    ↓
v3.0 Core (POSIX/awk) + Apps (P2P, SDK in apps/)
```

**Compatibility**:
- v3.0 can read v2.0 traces (algebra records optional)
- v3.0 WIDs are **more deterministic** (CPNF guarantees)
- v2.0 `.procedure` can be converted to v3.0 CPNF

---

## Propagation Matrix: What Flows Where

| Feature | v1.1 | v2.0 | v3.0 | Propagation Direction |
|---------|------|------|------|-----------------------|
| **Five Principles** | ✓ Defined | ✓ Preserved | ✓ Preserved | v1.1 → v2.0 → v3.0 |
| **Dotfile Authority** | ✓ Core | ✓ Core | ✓ Core | v1.1 → v2.0 → v3.0 |
| **Self-Encoding** | ✓ Implemented | ✓ Preserved | ✓ Preserved | v1.1 → v2.0 → v3.0 |
| **Pattern_Syntax** | ✓ Multiset | ✓ Multiset | — Replaced | v1.1 → v2.0, then formalized in v3.0 |
| **BALL/POINT Terms** | — | ✓ Introduced | ✓ Preserved | v2.0 → v3.0 |
| **E8×E8 Policy** | — | ✓ Introduced | ✓ Preserved | v2.0 → v3.0 |
| **Network Protocol** | — | ✓ Implemented | — Extracted | v2.0 only (moved to apps in v3.0) |
| **`.interface`** | — | ✓ Optional | ✓ Optional | v2.0 → v3.0 |
| **CPNF** | — | — | ✓ Mandatory | v3.0 only |
| **Execution Algebra** | — | — | ✓ Formalized | v3.0 only |
| **View Model** | Informal | Informal | ✓ Specified | Formalized in v3.0 |
| **Conformance Tests** | Manual | `test_determinism.sh` | ✓ Full Suite | Evolved across versions |
| **P2P/SDK** | — | ✓ Bundled | — Extracted | v2.0 bundled, v3.0 separated to apps/ |

---

## Architectural Evolution Timeline

### Phase 1: Foundation (v1.1)

**Goal**: Establish immutable principles

**Achievements**:
- Five principles sealed
- Pattern_Syntax with multiset validation
- Self-encoding mechanism
- Projection purity
- Effect closure

**Constraints**:
- Architecture hash frozen
- Breaking changes require v2

### Phase 2: Network Layer (v2.0)

**Goal**: Add peer-to-peer transport without breaking principles

**Achievements**:
- E8×E8 geometric routing
- Deterministic replication
- Network protocol (`ulp://`)
- Formal BALL/POINT model

**Constraints**:
- Preserve v1.1 core invariants
- Policy affects ordering only
- No semantic interpretation during transport

### Phase 3: Algebraic Formalization (v3.0)

**Goal**: Platform-agnostic core with formal algebra

**Achievements**:
- CPNF canonicalization (deterministic WID)
- Execution algebra (open envelope, shadows, weights)
- Conformance test suite
- View model contract
- Architectural separation (core vs. apps)

**Constraints**:
- POSIX/awk only (no Node.js/Python in core)
- Preserve v2.0 policy layer
- Extract applications to `apps/`

---

## Understanding the Relationships

### Linear Progression (Specification)

The **specification** evolves linearly:

```
v1.1 Spec
    ↓ (Add network, formalize terms)
v2.0 Spec
    ↓ (Add algebra, formalize canonicalization)
v3.0 Spec
```

Each version **builds upon** the previous specification.

### Parallel Implementations (Code)

The **implementations** are parallel:

```
           Common Foundation
                  |
        ┌─────────┼─────────┐
        |         |         |
     v1.1       v2.0      v3.0
   (Sealed)  (Network)  (Algebra)
```

Each version has **separate codebases** implementing overlapping concepts.

### Feature Inheritance

**Conceptual Inheritance** (what ideas carry forward):

```
v1.1 Principles
    ├─→ v2.0 Core Invariants
    └─→ v3.0 Core Invariants

v1.1 Dotfiles
    ├─→ v2.0 Dotfiles + .interface
    └─→ v3.0 Dotfiles + .symmetry + CPNF

v2.0 Policy
    └─→ v3.0 Policy (preserved)

v3.0 Algebra
    (No backward propagation to v1.1/v2.0)
```

### Code Reuse

**Almost none**. Each version has:
- Own `bin/run.sh`
- Own `bin/` tools
- Own `world/` examples
- Own `interrupts/` handlers

**Shared** (conceptually, not via import):
- Hash algorithm (SHA-256)
- Trace format concepts
- Dotfile semantics

---

## Migration Paths

### v1.1 Trace → v2.0 Context

**Scenario**: You have a v1.1 trace, want to use in v2.0

**Steps**:
1. Read v1.1 trace as-is (compatible)
2. Compute RID from trace bytes
3. Derive policy: `E8L`, `E8R`, chirality
4. Append `POLICY`/`GEOMETRY`/`REPLICA` records (optional)
5. Use in v2.0 network

**Compatibility**: v1.1 traces are valid v2.0 traces (subset)

### v2.0 World → v3.0 World

**Scenario**: Convert v2.0 `.procedure` to v3.0 CPNF

**Steps**:
1. Parse v2.0 `.procedure` (Pattern_Syntax)
2. Convert to polynomial representation
3. Canonicalize to CPNF via `bin/canon.sh`
4. Write CPNF `.procedure`
5. Recompute WID (will differ from v2.0)

**Compatibility**: Semantic equivalent, but WID changes

### v3.0 Core → v2.0 Network

**Scenario**: Execute in v3.0, replicate via v2.0 network

**Steps**:
1. Execute in `ulp-v3.0/bin/run.sh` (creates trace)
2. Extract RID from trace
3. Use `apps/p2p-server-node/` for network transport
4. Verify via fingerprint

**Compatibility**: v3.0 traces are superset of v2.0 (extra `ALG_*` records ignored)

---

## Key Differences Summary

### v1.1 vs. v2.0

| Aspect | v1.1 | v2.0 |
|--------|------|------|
| **Status** | Sealed | Active |
| **Terminology** | World/Trace | BALL/POINT |
| **Network** | None | `ulp://` protocol |
| **Policy** | None | E8×E8 derivation |
| **Replication** | Unspecified | 9 deterministic slots |
| **Applications** | None | P2P servers, SDK bundled |

### v2.0 vs. v3.0

| Aspect | v2.0 | v3.0 |
|--------|------|------|
| **Canonicalization** | Manual | CPNF mandatory |
| **Execution Model** | Include/ignore | Algebraic admissibility |
| **Algebra** | Informal | Formal polynomial |
| **Implementation** | Monolithic | Core + Apps |
| **Platform** | POSIX (but includes Node.js) | Pure POSIX/awk |
| **Tests** | Determinism only | Full conformance suite |
| **Applications** | Bundled | Extracted to `apps/` |

### v1.1 vs. v3.0

| Aspect | v1.1 | v3.0 |
|--------|------|------|
| **Principles** | ✓ Same | ✓ Same |
| **WID** | `sha256(dotfiles)` | `sha256(CPNF(dotfiles))` |
| **Procedure** | Pattern_Syntax | CPNF polynomial |
| **Admissibility** | Include/ignore | Algebraic matching |
| **Policy** | None | E8×E8 (from v2.0) |
| **View Model** | Informal | Formalized |

---

## Design Rationale

### Why Parallel Implementations?

**Instead of**:
```
v1.1/ ← base
  ↓ (git branch)
v2.0/ ← extends v1.1
  ↓ (git branch)
v3.0/ ← extends v2.0
```

**We have**:
```
ulp-v1.1/ ← sealed snapshot
ulp-v2.0/ ← separate implementation
ulp-v3.0/ ← separate implementation
```

**Rationale**:
1. **v1.1 is sealed** - cannot modify, even to fix bugs
2. **v2.0 experiments** - network layer, not for v1.1 backport
3. **v3.0 refines** - formalization, not v2.0 replacement
4. **Users choose** - pick version for specific needs

### Why Not Backport v3.0 CPNF to v2.0?

**Tempting**: v3.0's CPNF is objectively better for WID determinism

**Why not**:
1. v2.0 is a **reference implementation** (specification target)
2. Breaking WID compatibility would invalidate existing v2.0 traces
3. v3.0 is the **canonical future** (use it for new work)
4. v2.0 remains useful for understanding network layer in isolation

### Why Extract Apps in v3.0?

**v2.0 bundled**: `ulp-v2.0/{p2p-server,p2p-server-node,ulp-sdk}/`

**v3.0 extracted**: `apps/{p2p-server,p2p-server-node,ulp-sdk}/`

**Rationale**:
1. **Core purity**: v3.0 is POSIX/awk only, no Node.js
2. **Platform agnostic**: Core runs anywhere, apps have dependencies
3. **Separation of concerns**: Execution ≠ Transport
4. **Reusability**: Apps can work with any ULP version

---

## When to Use Each Version

### Use v1.1 When...

- You need a **frozen specification** (guaranteed no breaking changes)
- You're building on the **original sealed architecture**
- You want the **simplest implementation** (no network, no algebra)
- You're studying the **core principles** in purest form

**Example**: Academic research, formal verification, minimal deployments

### Use v2.0 When...

- You need **P2P networking** and **geometric routing**
- You want **deterministic replication** (9 slots)
- You're working with the **reference network protocol**
- You prefer **bundled applications** (P2P + SDK together)

**Example**: Distributed systems, peer-to-peer applications, network experiments

### Use v3.0 When...

- You need **guaranteed WID determinism** (CPNF)
- You want **formal execution algebra** (open envelope, shadows)
- You're building **platform-agnostic** tools (POSIX only)
- You need **conformance testing**
- You want the **latest formalization**

**Example**: Production deployments, cross-platform tools, new development

### Mix and Match

You can combine versions:

```bash
# Execute in v3.0 (deterministic WID, algebra)
cd ulp-v3.0
printf 'data\n' | ./bin/run.sh world out

# Transport via v2.0 network
cd ../apps/p2p-server-node
node server.js

# Use SDK from apps
cd ../ulp-sdk
npm install
node -e "const ulp = require('./src'); ulp.verify('trace.log')"
```

**Benefit**: Best of all versions (v3 execution + v2 network + shared apps)

---

## The Big Picture

### Evolution as Refinement, Not Replacement

```
v1.1: "Here are the immutable principles"
   ↓
v2.0: "Here's how to add networking without breaking principles"
   ↓
v3.0: "Here's how to formalize the algebra while preserving both"
```

Each version **refines** the specification without **invalidating** previous work.

### Three Lenses on One Truth

All three versions agree on:
- Execution constructs traces
- Traces are deterministic
- Traces are self-encoding
- Dotfiles are authority
- Projections are pure

They differ on:
- How to ensure determinism (manual vs. CPNF)
- Whether to include network (none vs. protocol vs. extracted)
- How to formalize execution (Pattern_Syntax vs. multiset vs. algebra)

### Future Evolution

**What's next?**
- v3.1+ will refine algebra (add new envelope modes?)
- v4.0 might add new principles (breaking change)
- Applications will continue evolving in `apps/`

**Guaranteed**:
- v1.1 remains sealed (hash never changes)
- Core principles preserved (across all versions)
- Traces remain verifiable (fingerprints are forever)

---

## Summary: The Progression

### Conceptual Flow

```
Foundation (v1.1)
    ↓ (preserve principles, add layer)
Network (v2.0)
    ↓ (formalize, separate concerns)
Algebra (v3.0)
```

### Implementation Reality

```
v1.1 ←─ sealed snapshot
v2.0 ←─ parallel implementation (core + network)
v3.0 ←─ parallel implementation (core only, formalized)
apps ←─ extracted (network, SDK, applications)
```

### What Propagates

**Always Forward** (v1.1 → v2.0 → v3.0):
- Five immutable principles
- Dotfile structure
- Self-encoding mechanism
- Determinism requirement

**Sometimes Forward** (v2.0 → v3.0, not to v1.1):
- BALL/POINT terminology
- Policy/Geometry/Replica derivation

**Version-Specific** (no propagation):
- v1.1 Pattern_Syntax multiset validation (replaced in v3.0)
- v2.0 bundled apps (extracted in v3.0)
- v3.0 CPNF canonicalization (too breaking for backport)
- v3.0 execution algebra (formalization, not in v1.1/v2.0)

---

## Conclusion

ULP's evolution is **intentional heterogeneity**:

- **v1.1**: Sealed foundation that never changes
- **v2.0**: Network extension exploring geometric routing
- **v3.0**: Formalized refinement for production use

They coexist as **parallel implementations of an evolving vision**, not sequential releases where each obsoletes the previous.

Choose based on your needs. Use multiple versions together. The traces are compatible (modulo extra metadata), the principles are preserved, and the vision is unified.

**The trace is the machine. Everything else is a view.** — This truth spans all versions.
