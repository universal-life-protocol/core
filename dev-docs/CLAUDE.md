# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Universal Life Protocol (ULP) v1.1 is a sealed trace calculus where execution constructs append-only traces, capabilities are declarative world definitions, and all runtime environments are pure projections of trace truth.

**Core Principle**: "The trace is the machine. Everything else is a view."

## Key Commands

### Working with the Archive Implementation

The working implementation is in `archive/ulp/`:

```bash
# Execute a trace from stdin
echo -e 'hello\nworld' | ./archive/ulp/bin/run.sh archive/ulp/world archive/ulp/out

# Validate system invariants
./archive/ulp/validate.sh

# Reconstruct from trace (self-encoding)
./archive/ulp/bin/decode_trace.sh archive/ulp/out/trace.log /tmp/reconstructed

# Re-execute reconstructed system (verify determinism)
cd /tmp/reconstructed/REPO
echo -e 'hello\nworld' | ./bin/run.sh ../WORLD out2

# Verify byte-for-byte determinism
cmp archive/ulp/out/trace.log /tmp/reconstructed/REPO/out2/trace.log

# Compute trace hash (for verification)
./archive/ulp/bin/hash.sh < archive/ulp/out/trace.log

# View trace using projection
./archive/ulp/bin/observe.sh archive/ulp/world archive/ulp/out/trace.log
```

### Building from Scratch

```bash
# Build complete system
cd archive
./build.sh

# This creates archive/ulp/ with full implementation
```

## Architecture

### The Five Immutable Principles

1. **Trace is Ground Truth**: Execution = append-only trace construction
2. **World is Non-Executable**: Specifications define structure, not execution
3. **Projections are Pure**: Views are deterministic, effect-free functions
4. **Effects are Forward-Only**: .interpose maps events → effects, never reads trace
5. **Information Flows Forward**: World → Execution → Trace → Projection

These principles are **frozen** in v1.1. Any changes require a breaking version (v2).

### The Four Layers

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  World          │─────▶│  Execution       │─────▶│  Trace           │─────▶│  Observation    │
│  Definition     │      │  Structure       │      │  (Ground Truth)  │      │  (Pure Views)   │
│                 │      │                  │      │                  │      │                 │
│ • .genesis      │      │ • .procedure     │      │ • Append-only    │      │ • .projection   │
│ • .env          │      │ • .interrupt     │      │ • Self-encoding  │      │ • Pure funcs    │
│ • .atom         │      │ • .interpose     │      │ • Authoritative  │      │ • Lossy         │
│ • .manifest     │      │                  │      │                  │      │                 │
│ • .schema       │      │                  │      │                  │      │                 │
│ • .sequence     │      │                  │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └──────────────────┘      └─────────────────┘
```

### World Definition Files (`world/`)

All world files are **non-executable**, **identifier-only** descriptors:

- `.genesis` - Origin metadata (author, created date, paradigm)
- `.env` - Environment constraints (inputs, outputs, effects)
- `.atom` - Primitive units (unit, encoding, normalization)
- `.manifest` - Component inventory
- `.schema` - Trace structure specification
- `.sequence` - Ordering constraints
- `.include` - Allowlist of interrupt names
- `.ignore` - Blocklist of interrupt names
- `.procedure` - Control flow patterns with Pattern_Syntax: `procedure NAME (([ interrupt NAME ])(`
- `.interrupt` - Event hooks (on_start PROCEDURE, interrupt NAME)
- `.interpose` - Effect mapping (EVENT_TYPE -> EFFECT_SYMBOL)
- `.projection` - Pure function declarations mapping traces to views
- `.view` - Observer configuration
- `.record` - Recording metadata

### Interrupt Handlers (`interrupts/`)

Executable shell scripts that perform actual computation:
- Named like `PRINT.sh`, `UPPERCASE.sh`, etc.
- Must be listed in `.include` to be allowed
- Can be blocked by `.ignore`
- Contribute events to trace construction

### Core Utilities (`bin/`)

- `run.sh` - Main execution engine (validates, constructs trace, self-encodes)
- `hash.sh` - SHA-256 hashing (portable across sha256sum/shasum/openssl)
- `canon.awk` - Canonicalize identifier-only files
- `proc.awk` - Parse `.procedure` with multiset validation for Pattern_Syntax
- `self_encode.sh` - Append self-encoding bundle to trace
- `decode_trace.sh` - Reconstruct files from trace
- `observe.sh` - View traces per `.view` specification
- `trace.awk` - Trace formatting utilities

## Critical Implementation Details

### Pattern_Syntax and Multiset Validation

The `.procedure` file uses delimiter-based scoping with multiset validation:

```
procedure render_lines
(([
interrupt PRINT
[((
```

**Rule**: Opening and closing delimiter signatures must form matching multisets:
- Opening: `(([`
- Closing: `[((`
- These are equivalent multisets: both contain `(`, `(`, `[`

The `proc.awk` script validates this via `multiset_key()` which sorts characters for order-insensitive comparison.

### Trace Format

Traces use tab-separated fields with the following event types:

```
HDR     version  1
HEADER  world_hash <hash>
INPUT   line <base64>
CLAUSE  qid <hash> openSig <sig> closeSig <sig> intr <name>
EXEC    eid <hash> wid <hash> qid <hash> intr <name>
STDOUT  n <line_num> text <escaped_text>
STDERR  n <line_num> text <escaped_text>
EXIT    intr <name> code <rc>
```

Self-encoding bundle appended at end:
```
MANIFEST  sha256 <hash> count <n>
FILE      path <vpath> sha256 <hash> mode <mode> bytes <n>
DATA      <base64_line>
END_FILE  path <vpath>
```

**Important**: Traces are deterministic - same inputs always produce byte-for-byte identical traces.

### Self-Encoding Mechanism

Every trace contains:
1. Execution records (what happened)
2. Complete world definition (WORLD/ virtual path)
3. Complete execution tools (REPO/ virtual path)

This enables:
- **Reconstruction**: Any trace can rebuild the program that created it
- **Reproducibility**: Reconstructed program produces identical trace
- **Preservation**: Traces are completely self-contained

### Effect System

Effects are a **closed algebra** defined in `effect_interpreter.sh`:
- `read_stdin`, `write_stdout`, `write_stderr`
- `exit_with_code`, `open_file_r`, `create_file`

The `.interpose` file maps events to these symbols declaratively:
```
INPUT -> read_stdin
OUTPUT -> write_stdout
```

**No dynamic effect creation** - prevents Turing-completeness in effect layer.

## Development Practices

### When Modifying Code

1. **Preserve the Five Principles**: Any change that violates principles requires v2
2. **Validate Early**: Run `validate.sh` after changes
3. **Maintain Determinism**: Same inputs must produce identical traces
4. **Keep World Files Non-Executable**: Only identifier-only content, no control flow
5. **Projections Must Be Pure**: No exec/eval/system calls, no I/O

### Testing Determinism

```bash
# Generate trace
echo "test" | ./bin/run.sh world out1

# Generate again
echo "test" | ./bin/run.sh world out2

# Must be byte-for-byte identical
cmp out1/trace.log out2/trace.log
```

### Adding New Interrupts

1. Create executable handler: `interrupts/NEW_INTERRUPT.sh`
2. Add to `.include`: `echo "NEW_INTERRUPT" >> world/.include`
3. Update `.procedure` to reference it
4. Update `.interrupt` if needed
5. Test with validation suite

### Debugging Traces

```bash
# View raw trace
cat out/trace.log

# View only semantic content (no metadata lines starting with #METADATA)
grep -v '^#METADATA' out/trace.log

# View specific event types
awk -F '\t' '$1=="STDOUT"' out/trace.log
awk -F '\t' '$1=="EXEC"' out/trace.log

# Decode base64 payloads
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d
```

### Termux Compatibility Notes

This codebase is developed on Termux (Android). Key considerations:

1. **In-memory sorting**: `proc.awk` uses temp files instead of `asort()` for multiset validation
2. **Portable stat**: `self_encode.sh` handles different stat implementations
3. **Hash tool detection**: `hash.sh` tries sha256sum, shasum, then openssl
4. **Base64 handling**: Uses `base64 -d` for decoding (GNU coreutils compatible)

## Architectural Constraints (Frozen)

### Closed Vocabulary Sets

- **Network Events**: 16 types (CREATE_SOCKET, CONNECT, SEND, etc.)
- **Effect Symbols**: 13 symbols (socket_create, socket_connect, etc.)
- **Projection Classes**: 16 classes (posix, w3c_html, bip32, etc.)
- **World File Types**: 13 types (.genesis, .env, .atom, etc.)

### Key Invariants

- No address literals in traces (IPs, ports, MACs forbidden)
- Trace-time ordering only (no wall-clock dependence)
- Air-gapped by default (.network absent = no networking)
- World files non-executable (identifier-only, no control flow)
- Forward-only information flow (World → Execution → Trace → Projection)

## Documentation Structure

The repository contains extensive documentation:

- `Final README.md` - Technical overview and API reference
- `Final Seal - README.md` - Marketing/vision document
- `Executive Summary.md` - One-page executive summary
- `archive/ulp/README.md` - Working implementation guide
- `archive/GETTING_STARTED.md` - Tutorial for new users
- Various specification documents (Final Champion, Final Metaverse, etc.)

## Common Patterns

### Creating a Minimal World

```bash
mkdir -p myworld
cat > myworld/.genesis << 'EOF'
user brian
runtime posix
EOF

cat > myworld/.env << 'EOF'
stdin file
stdout file
EOF

cat > myworld/.atom << 'EOF'
atom line
EOF

# Add .procedure, .interrupt, etc. as needed
```

### Validating World Dotfiles

```bash
# Check identifier-only constraint
awk -f bin/canon.awk world/.genesis

# Check procedure multiset validation
awk -f bin/proc.awk world/.procedure
```

### Working with the Sealed Architecture

**Allowed** (within v1.1):
- Bug fixes that preserve semantics
- Performance optimizations
- New projection implementations
- Better tooling and documentation
- Additional validation checks

**Prohibited** (requires v2 proposal):
- Changing the five principles
- Making traces mutable
- Adding effects to projections
- Making world definitions executable
- Creating backward information flow

## Architecture Hash

```
9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd
```

This hash represents the sealed v1.1 architecture (SHA-256 of ULP-v1.1-ARCHITECTURE.txt). Changes that alter this hash require a breaking version.
