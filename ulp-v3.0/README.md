# ULP v3.0

**Universal Life Protocol v3.0** - A deterministic execution protocol with formal algebraic semantics

Platform-agnostic POSIX sh + awk implementation that refines v1.1 and v2.0 with canonical polynomial algebra, admissibility rules, and conformance testing.

## Core Principle

```
(BALL + input) → POINT
```

Where:
- **BALL** = World definition (dotfiles)
- **input** = stdin
- **POINT** = Deterministic, append-only trace

**Same inputs always produce byte-identical outputs.**

## What is ULP v3.0?

ULP v3.0 is a deterministic execution protocol where:

1. **World dotfiles are the only authority** - All execution rules live in non-executable configuration files
2. **Execution produces verifiable traces** - Complete, self-encoding logs of all operations
3. **Polynomial algebra controls admissibility** - Formal rules determine which operations execute
4. **Determinism is mandatory** - Identical inputs produce byte-identical traces
5. **Views are projection-only** - Observations never mutate or infer

### Key Innovations in v3.0

- **Canonical Polynomial Normal Form (CPNF)** for deterministic world identity
- **Formal execution algebra** with envelope constraints and shadow matching
- **Admissibility rules** using capacity and sign constraints
- **Conformance test suite** validating all core invariants
- **View model renderer** for deterministic projection
- **E8×E8 policy layer** for geometric routing (v2 compatibility)

## Quick Start

### Prerequisites

- POSIX `sh`
- `awk`, `sort`, `base64`
- One of: `sha256sum`, `shasum`, or `openssl`

### Run Your First Trace

```bash
cd ulp-v3.0

# Execute: stdin → world → trace
printf 'hello\nworld\n' | ./bin/run.sh world out

# View the trace
cat out/trace.log

# Inspect derived metadata
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

The trace contains:
- World identity (WID) - `sha256(canonicalized_dotfiles)`
- Algebra evaluation records (admissibility decisions)
- Execution events (interrupts that ran)
- I/O records (stdin/stdout/stderr)
- Result identity (RID) - `sha256(trace)`
- Policy/geometry metadata (E8×E8 lattice)
- Self-encoding bundle (complete reconstruction data)

### Verify Determinism

```bash
sh ./test_determinism.sh
```

This verifies the **critical invariant**: identical inputs produce byte-identical traces.

## World Structure

A world directory contains dotfiles that define execution rules:

```
world/
├── .genesis       # Origin metadata (user, runtime)
├── .env          # Environment constraints (stdin, stdout)
├── .atom         # Atom declarations with optional weights
├── .manifest     # Global constraints (max degree, banned prefixes)
├── .procedure    # Polynomial envelope (CPNF required)
├── .interrupt    # Polynomial fragments per interrupt (CPNF required)
├── .include      # Allowed interrupt names
├── .ignore       # Denied interrupt names
├── .sequence     # Ordering constraints
├── .schema       # Trace structure specification
├── .view         # Projection configuration
├── .record       # Recording metadata
└── .symmetry     # Symmetry declarations

interrupts/
├── PRINT.sh      # Interrupt handler (executable)
└── ...
```

### Example: Simple Line Printer

**.atom**
```
atom line
```

**.procedure**
```
procedure render_lines v3
domain:
  +1 line
end domain

mode open
sign same
shadow first_atom
end procedure
```

**.interrupt**
```
on_start render_lines

interrupt PRINT v3
poly:
  +1 line
end poly
end interrupt
```

This world admits the PRINT interrupt because:
1. `line` atom is declared in `.atom`
2. Monomial `line` appears in the procedure envelope
3. Capacity constraint: `abs(+1) <= abs(+1)` ✓
4. Sign constraint: `same` → `sign(+1) == sign(+1)` ✓

## Execution Algebra

### Atoms and Monomials

**Atoms** are primitive units:
```
atom scope
atom order
atom bind
```

**Monomials** are ordered sequences:
```
scope              # degree 1
scope.order        # degree 2
scope.order.bind   # degree 3
```

### Polynomials

**Procedure envelope** defines capacity:
```
procedure execute v3
domain:
  +3 scope
  +2 scope.order
  +1 scope.order.bind
end domain
mode closed
sign same
end procedure
```

**Interrupt fragments** propose execution:
```
interrupt BIND v3
poly:
  +1 scope.order.bind
end poly
end interrupt
```

### Admissibility

For each monomial in an interrupt fragment:

1. ✓ Atoms declared in `.atom`
2. ✓ Manifest constraints (max_degree, max_wdegree, banned prefixes)
3. ✓ Envelope containment (closed) or shadow matching (open)
4. ✓ Capacity: `abs(I(m)) <= abs(E(m))`
5. ✓ Sign constraint (if `sign=same`)

**First-failure-wins** in CPNF order.

## CPNF Canonicalization

Canonical Polynomial Normal Form ensures deterministic world identity:

1. Combine like monomials (sum coefficients)
2. Drop zero coefficients
3. Order by: (a) monomial length ascending, (b) lexicographic
4. Serialize as `±c monomial`

**Example:**
```
# Input (any order)
+1 a.b
+2 a
+3 b.a
-1 a
+1 b.a.c

# CPNF output
+1 a
+1 a.b
+1 b.a.c
+4 b.a
```

**Critical**: `.procedure` and `.interrupt` MUST be in CPNF for WID calculation.

```bash
# Canonicalize dotfile
sh ./bin/canon.sh world/.procedure
```

## Testing

### Conformance Suite

```bash
# Run all tests
sh ./test_conformance.sh

# Individual tests
sh ./test_determinism.sh      # Byte-identical traces
sh ./test_cpnf.sh             # CPNF ordering
sh ./test_admissibility.sh    # Algebra rules
sh ./test_trace_schema.sh     # Trace format
sh ./test_view_model.sh       # View rendering
```

### Determinism Verification

The test runs the same input twice and verifies:
- RIDs are identical
- Traces are byte-for-byte identical
- Policy seeds are deterministic
- Geometry selection is deterministic
- Replica slots are deterministic

## View Rendering

Views define deterministic projections from traces:

```bash
sh ./bin/view_model.sh \
  examples/quadrants-octree.view \
  examples/trace-quadrants.json \
  /tmp/view-model.json
```

Views MUST be:
- Projection-only (no inference, no authority transfer)
- Deterministic (same trace → same view model)
- Reversible (trace entries can be re-identified)

See `ULP-v3.0-VIEW.md` for the view specification.

## Trace Format

All trace records are tab-separated:

| Record Type | Purpose |
|------------|---------|
| `HDR` | Trace header |
| `BALL` | World identity (WID) |
| `ALG_*` | Algebra evaluation (CPNF, admissibility) |
| `STDIN` / `STDOUT` / `STDERR` | I/O events |
| `CLAUSE` / `EXEC` / `EXIT` | Execution events |
| `POLICY` / `GEOMETRY` / `REPLICA` | E8×E8 metadata |
| `MANIFEST` / `FILE` / `DATA` | Self-encoding bundle |
| `END` | Trace terminator |

### Example Trace Inspection

```bash
# View algebra decisions
awk -F '\t' '$1=="ALG_ADMIT"' out/trace.log

# View execution events
awk -F '\t' '$1=="EXEC"' out/trace.log

# View policy metadata
grep "^POLICY" out/trace.log

# Extract self-encoding manifest
awk '/^MANIFEST/,/^END$/' out/trace.log
```

## Repository Structure

```
ulp-v3.0/
├── bin/                      # Core engine
│   ├── run.sh               # Main execution engine
│   ├── poly.awk             # Polynomial algebra processor
│   ├── canon.sh             # CPNF canonicalization
│   ├── hash.sh              # Portable SHA-256
│   ├── policy.sh            # E8×E8 policy derivation
│   ├── geometry.sh          # Geometry metadata
│   ├── replica.sh           # Replica slot calculation
│   ├── view_model.sh        # View renderer
│   └── self_encode.sh       # Self-encoding bundle
├── world/                   # Example world
├── interrupts/              # Example interrupt handlers
├── examples/                # Example traces and views
├── test_*.sh                # Conformance test suite
├── ULP-v3.0-SPEC.md        # Formal specification (normative)
├── ULP-v3.0-GRAMMAR.md     # EBNF grammar (normative)
├── ULP-v3.0-VIEW.md        # View specification (normative)
├── USER-GUIDE.md           # User guide
└── CLAUDE.md               # Developer guide for Claude Code
```

## Documentation

- **[ULP-v3.0-SPEC.md](ULP-v3.0-SPEC.md)** - Formal specification (normative)
- **[ULP-v3.0-GRAMMAR.md](ULP-v3.0-GRAMMAR.md)** - EBNF grammar and vocabulary (normative)
- **[ULP-v3.0-VIEW.md](ULP-v3.0-VIEW.md)** - View specification and renderer contract (normative)
- **[USER-GUIDE.md](USER-GUIDE.md)** - User-facing guide and roadmap
- **[AGENTS.md](AGENTS.md)** - Quick reference for automated agents
- **[CLAUDE.md](CLAUDE.md)** - Developer guide for Claude Code

## Examples

### Debugging Traces

```bash
# View all algebra records
awk -F '\t' '/^ALG_/' out/trace.log

# View admitted interrupts
awk -F '\t' '$1=="ALG_ADMIT" {print $2}' out/trace.log

# Decode base64 payloads
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d
```

### Creating a Custom Interrupt

1. Create handler: `interrupts/UPPERCASE.sh`
```bash
#!/bin/sh
while IFS= read -r line; do
  echo "$line" | tr '[:lower:]' '[:upper:]'
done
```

2. Add to `.include`:
```bash
echo "UPPERCASE" >> world/.include
```

3. Define in `.interrupt`:
```
interrupt UPPERCASE v3
poly:
  +1 line
end poly
end interrupt
```

4. Make executable and test:
```bash
chmod +x interrupts/UPPERCASE.sh
printf 'hello\n' | ./bin/run.sh world out
```

## Platform Compatibility

Developed and tested on Termux (Android). Portable to any POSIX system:

- POSIX sh (no bash-isms)
- Portable stat, hash, base64 handling
- No GNU extensions
- Minimal dependencies

## Differences from v1.1 and v2.0

### From v1.1
- Adds CPNF canonicalization for deterministic WID
- Formalizes execution algebra with envelope/fragment/admissibility
- Adds conformance test suite
- Adds view model renderer

### From v2.0
- Includes v2.0 policy layer (E8×E8)
- Excludes network protocol (moved to `apps/`)
- Adds `.symmetry` dotfile for algebra configuration
- Refines grammar with normative EBNF

See documentation at repository root for version evolution details.

## License

See repository root for license information.

## Status

**ULP v3.0 is under active development.** Core execution and algebra are stable. Remaining work includes:

- Complete trace schema formalization
- Extended conformance tests for all manifest constraints
- Platform-neutral packaging and installer

See `USER-GUIDE.md` section 9 for detailed completion roadmap.
