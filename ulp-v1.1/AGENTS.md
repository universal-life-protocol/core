# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Universal Life Protocol v1.1 is a **sealed trace calculus** where execution IS trace construction. This implementation is **frozen** - the Five Principles are immutable and breaking any requires a version bump to v2.0+.

**Core Philosophy**: "The trace is the machine. Everything else is a view."

Architecture Hash: `9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd`

## The Five Immutable Principles

These are **sealed** - any violation requires a new major version:

1. **Trace is Append-Only and Authoritative** - Ground truth, never mutated
2. **World Definition is Non-Executable** - Identifier-only data, no control flow
3. **Projections are Pure Functions** - Read-only views, no side effects
4. **Effects are Forward-Only via .interpose** - Declarative event → effect mapping
5. **Information Flows Forward-Only** - Causal ordering preserved (World → Execution → Trace → Projection)

## Essential Commands

### Core Execution

```bash
# Execute trace from stdin
echo "hello world" | ./bin/run.sh world out

# Execute with custom world/output directories
echo "input" | ./bin/run.sh custom_world custom_out

# Execute with specific entry procedure (default: first in .procedure)
echo "input" | ./bin/run.sh world out entry_proc_name
```

### Validation and Testing

```bash
# Run complete validation suite (recommended before commits)
./validate.sh

# Validate world definition only
./bin/validate_world.sh world

# Verify architecture invariants
./bin/verify_architecture.sh

# Test determinism manually
echo "test" | ./bin/run.sh world out1
echo "test" | ./bin/run.sh world out2
cmp out1/trace.log out2/trace.log  # Must be byte-identical
```

### Projection and Observation

```bash
# View trace with default projection (from .view or canonical)
./bin/observe.sh world out/trace.log

# View with specific projection type (one of 16 sealed types)
./bin/observe.sh world out/trace.log posix
./bin/observe.sh world out/trace.log json
./bin/observe.sh world out/trace.log w3c_html

# The 16 sealed projection classes:
# Text: posix, json, markdown, pure
# Visual: w3c_html, w3c_dom, w3c_css
# 3D: webgl_3d, canvas_2d, vulkan
# Identity: bip32, bip39
# Analysis: graph, network_graph, print
# Meta: raw, canonical
```

### Self-Encoding and Reconstruction

```bash
# Decode trace to extract embedded world and repository
./bin/decode_trace.sh out/trace.log reconstructed/

# Re-execute from reconstructed files (tests self-encoding)
cd reconstructed/REPO
echo "test" | ./bin/run.sh ../WORLD out2

# Verify reconstruction produced identical trace
cmp <original_trace.log> reconstructed/REPO/out2/trace.log
```

### Trace Inspection

```bash
# View complete trace
cat out/trace.log

# Filter by event type
awk -F '\t' '$1=="HDR"' out/trace.log      # Headers
awk -F '\t' '$1=="WORLD"' out/trace.log    # World identity
awk -F '\t' '$1=="STDIN"' out/trace.log    # Input events
awk -F '\t' '$1=="STDOUT"' out/trace.log   # Output events
awk -F '\t' '$1=="EXEC"' out/trace.log     # Execution events
awk -F '\t' '$1=="CLAUSE"' out/trace.log   # Clause records
awk -F '\t' '$1=="SEAL"' out/trace.log     # Cryptographic seals

# Decode base64 data sections
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d

# Extract self-encoding manifest
awk '/^MANIFEST/,/^END$/' out/trace.log
```

### Hashing and Verification

```bash
# Compute trace hash
./bin/hash.sh < out/trace.log

# Compute World ID (WID) from world files
cat world/.* | ./bin/hash.sh

# Verify trace seal matches computed hash
grep "^SEAL" out/trace.log | grep semantic_hash
```

## Architecture

### Directory Structure

```
world/              World definition (15 dotfiles - closed set)
├── .genesis        Identity and version metadata
├── .env            Environment declarations (stdin/stdout/effects)
├── .atom           Primitive unit declarations
├── .manifest       File inventory
├── .schema         Type definitions
├── .sequence       Ordered execution constraints
├── .include        Interrupt handler allowlist
├── .ignore         Interrupt handler blocklist
├── .procedure      Pattern_Syntax execution structure
├── .interrupt      Interrupt handler declarations
├── .view           Observer configuration
├── .record         Trace event schemas
├── .interpose      Event → effect mappings (forward-only)
├── .projection     Projection definitions
└── .schema         Type system declarations

interrupts/         Interrupt handlers (executable shell scripts)
├── PRINT.sh        Output handler
├── ECHO.sh         Echo handler
├── UPPERCASE.sh    Text transformation
├── REVERSE.sh      String reversal
├── COUNT.sh        Line counter
└── ...             (must be listed in .include, not in .ignore)

bin/                Core execution utilities
├── run.sh          Main trace construction engine
├── observe.sh      Projection dispatcher
├── self_encode.sh  Self-encoding bundle generator
├── decode_trace.sh Trace → files reconstruction
├── validate_world.sh  World invariant checker
├── verify_architecture.sh  Architecture validator
├── hash.sh         Portable SHA-256 (tries sha256sum/shasum/openssl)
├── canon.awk       Identifier-only validator (enforces Principle 2)
├── proc.awk        Pattern_Syntax parser with multiset validation
└── trace.awk       Trace formatting utilities

projections/        Projection implementations (organized by type)
├── text/           posix, json, markdown, pure
├── visual/         w3c_html, w3c_dom, w3c_css
├── 3d/             webgl_3d, canvas_2d, vulkan
├── identity/       bip32, bip39
├── analysis/       graph, network_graph, print
└── meta/           raw, canonical

out/                Default output directory for traces
└── trace.log       Append-only execution trace
```

### World Definition System

**World files** are non-executable authority definitions containing only identifiers, no control flow (enforced by `canon.awk`).

**World ID (WID)**: `sha256(concatenated_dotfiles)` - cryptographically binds trace to world definition

**Pattern_Syntax**: Delimiter-based scope syntax with multiset validation
- Opening signature: `(([`
- Closing signature: `]((` or `))]`
- Validation: `multiset(open) == multiset(close)` (order-independent)
- Parsed by `proc.awk`

### Trace Format Structure

Every trace contains these sections in order:

```
#METADATA            Non-semantic metadata (version, architecture hash)
HDR                  Header records (version=1)
WORLD                World identity (WID hash)

BEGIN encoding       Self-encoding bundle start
MANIFEST             File inventory
FILE ... DATA ... END_FILE    (repeated for each file)
END encoding         Self-encoding bundle end

BEGIN input          Input section start
STDIN                Input records (base64 encoded)
END input            Input section end

BEGIN execution      Execution section start
CLAUSE               Clause records (pattern signatures)
EXEC                 Execution events (interrupt invocations)
STDOUT/STDERR        Output events
EXIT                 Exit codes
END execution        Execution section end

SEAL                 Cryptographic seals (semantic_hash, wid)
```

### Execution Flow

1. **Validation**: `validate_world.sh` checks world files are identifier-only
2. **WID Computation**: Hash all world dotfiles to create World ID
3. **Pattern Parsing**: `proc.awk` parses `.procedure` with multiset validation
4. **Trace Header**: Write `#METADATA`, `HDR`, `WORLD` records
5. **Self-Encoding**: `self_encode.sh` embeds world + repository in trace
6. **Input Recording**: Stdin events appended as `STDIN` records
7. **Execution**: Interrupt handlers invoked, events recorded as `EXEC`, `STDOUT`, etc.
8. **Sealing**: Cryptographic hashes appended as `SEAL` records
9. **Atomic Publish**: Trace moved from temp to final location with lock

## Key Implementation Details

### Determinism Requirements

**Critical**: Same inputs MUST produce byte-identical traces.

Forbidden in traces:
- Wall-clock timestamps (use trace-time sequence numbers only)
- Random values or nonces
- Network literals (IPs, ports, MACs)
- Non-deterministic system calls
- File system timestamps
- Process IDs or thread IDs

Required:
- Canonical sorting of world files
- Deterministic hash functions (SHA-256)
- Stable interrupt ordering
- Reproducible base64 encoding

### Pattern_Syntax Multiset Validation

Opening and closing delimiters must match as multisets (order-independent):

```
procedure demo
(([                    # Open signature: ( ( [
interrupt PRINT
](()                   # Close signature: ] ( ( )
```

Multiset validation: `sort("(([")` must equal `sort("]((")`

**Implementation**: `proc.awk` extracts delimiter characters, sorts them, compares

### Self-Encoding Bundle

Every trace embeds its complete execution environment:

```
MANIFEST    files_count 47  bytes_total 125384
FILE        path WORLD/.genesis  sha256 abc123...  mode 644  bytes 59
DATA        dXNlciBicmlhbg==  # base64 of file content
END_FILE    path WORLD/.genesis
FILE        path REPO/bin/run.sh  sha256 def456...  mode 755  bytes 7614
DATA        IyEvYmluL3No...
END_FILE    path REPO/bin/run.sh
```

This enables perfect reconstruction via `decode_trace.sh`.

### Projection Purity

**Critical**: Projections MUST be pure functions with NO side effects.

Forbidden in projections:
- File I/O (read or write)
- Network operations
- System calls (exec, eval, system)
- Global state mutation
- Random number generation
- Timestamp queries

Projections are read-only views of traces. They transform trace records into different representations (stdout, JSON, HTML, 3D models, etc.) but never modify the trace or cause effects.

### Interrupt Handlers

Interrupt handlers are executable shell scripts in `interrupts/`:

- Must be listed in `.include` (allowlist)
- Must NOT be in `.ignore` (blocklist)
- Referenced in `.interrupt` dotfile
- Invoked during execution via `.procedure` control flow
- Can produce STDOUT/STDERR (recorded in trace)
- Must return exit code (recorded as `EXIT` event)

Example interrupt handler:

```bash
#!/bin/sh
# interrupts/UPPERCASE.sh
while read -r line; do
    echo "$line" | tr '[:lower:]' '[:upper:]'
done
```

## Development Constraints

### When Modifying Code

1. **NEVER violate the Five Principles** - this would break the seal and require v2.0+
2. **Preserve determinism** - same inputs must always produce byte-identical traces
3. **Keep world files identifier-only** - no control flow, validated by `canon.awk`
4. **Maintain projection purity** - no side effects, no I/O, read-only
5. **Test with validate.sh** - all 8 tests must pass before commits
6. **Verify architecture hash** - `sha256sum ULP-v1.1-ARCHITECTURE.txt` must match sealed hash

### POSIX Portability

This codebase targets POSIX sh (not bash) and is tested on Termux (Android):

- Use `#!/bin/sh` not `#!/bin/bash`
- Use `set -eu` for error handling
- Avoid GNU-isms (use portable POSIX constructs)
- Hash detection order: `sha256sum` → `shasum` → `openssl sha256`
- Base64 decode: `base64 -d` (portable across platforms)
- Sort characters via temp files (some awk implementations lack `asort()`)
- Portable stat handling in `self_encode.sh`

### Adding New Interrupts

1. Create executable handler in `interrupts/NEW_NAME.sh`
2. Add `NEW_NAME` to `world/.include`
3. Add declaration to `world/.interrupt`
4. Reference in `world/.procedure` control flow
5. Test with `./validate.sh`

Example:

```bash
# 1. Create handler
cat > interrupts/DOUBLE.sh << 'EOF'
#!/bin/sh
while read -r line; do
    echo "$line$line"
done
EOF
chmod +x interrupts/DOUBLE.sh

# 2. Add to allowlist
echo "DOUBLE" >> world/.include

# 3. Declare in .interrupt
echo "interrupt DOUBLE" >> world/.interrupt

# 4. Add to .procedure (using Pattern_Syntax)
# Edit world/.procedure to include DOUBLE interrupt

# 5. Test
./validate.sh
```

### Debugging Traces

```bash
# Check if trace was created successfully
test -f out/trace.log && echo "Trace exists" || echo "Trace missing"

# Verify trace structure (must have all required sections)
grep "^HDR" out/trace.log || echo "Missing HDR"
grep "^WORLD" out/trace.log || echo "Missing WORLD"
grep "^MANIFEST" out/trace.log || echo "Missing MANIFEST"
grep "^SEAL" out/trace.log || echo "Missing SEAL"

# Check for execution errors
grep "^ERROR" out/trace.log

# View interrupt execution sequence
awk -F '\t' '$1=="EXEC" {print $5}' out/trace.log

# Decode and inspect embedded files
./bin/decode_trace.sh out/trace.log /tmp/inspect
ls -la /tmp/inspect/WORLD/
ls -la /tmp/inspect/REPO/bin/
```

## Common Tasks

### Creating a Minimal World

```bash
mkdir -p myworld

cat > myworld/.genesis << 'EOF'
user brian
runtime posix
paradigm trace_first
version v1_1
EOF

cat > myworld/.env << 'EOF'
stdin file
stdout file
effects declarative
EOF

cat > myworld/.atom << 'EOF'
unit line
encoding utf8
EOF

cat > myworld/.procedure << 'EOF'
procedure main
(
interrupt PRINT
)
EOF

cat > myworld/.interrupt << 'EOF'
on_start main
interrupt PRINT
EOF

cat > myworld/.include << 'EOF'
PRINT
EOF

cat > myworld/.ignore << 'EOF'
# none
EOF

# ... create remaining dotfiles (.manifest, .schema, .sequence, .view, .record, .interpose, .projection)
# See existing world/ directory for examples
```

### Verifying Self-Encoding Completeness

```bash
# Execute trace
echo "test input" | ./bin/run.sh world out

# Reconstruct from trace
./bin/decode_trace.sh out/trace.log /tmp/reconstructed

# Re-execute from reconstructed world
cd /tmp/reconstructed/REPO
echo "test input" | ./bin/run.sh ../WORLD out2

# Verify byte-identical traces
cmp out2/trace.log <path_to_original>/out/trace.log
echo $?  # Should be 0 (identical)
```

### Testing Multiple Projections

```bash
# Generate trace once
echo "hello ulp" | ./bin/run.sh world out

# Project to different formats
./bin/observe.sh world out/trace.log posix > output.txt
./bin/observe.sh world out/trace.log json > output.json
./bin/observe.sh world out/trace.log w3c_html > output.html
./bin/observe.sh world out/trace.log canonical > output.canonical

# All projections view the same authoritative trace
```

## Architecture Seal

The v1.1 architecture is sealed with this hash:

```
9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd
```

Verify:

```bash
sha256sum ULP-v1.1-ARCHITECTURE.txt
```

Any change that breaks the Five Principles or modifies the closed vocabulary sets requires v2.0+, not v1.x.

## Closed Vocabulary Sets

These sets are **sealed** - additions/removals require version bump:

### 15 World Dotfiles
.genesis, .env, .atom, .manifest, .schema, .sequence, .include, .ignore, .procedure, .interrupt, .view, .record, .interpose, .projection, .schema

### 16 Trace Event Types
HDR, WORLD, FILE, DATA, END_FILE, STDIN, CLAUSE, EXEC, EVENT, STDOUT, STDERR, EXIT, ERROR, BEGIN, END, SEAL

### 16 Projection Classes
posix, json, markdown, pure, w3c_html, w3c_dom, w3c_css, webgl_3d, canvas_2d, vulkan, bip32, bip39, graph, network_graph, print, raw, canonical

## Documentation

- **README.md** - Overview and philosophy
- **QUICKSTART.md** - Step-by-step tutorials
- **ULP-v1.1-ARCHITECTURE.txt** - Canonical specification (source of architecture hash)
- **ULP-v1.1-SEAL.md** - Sealing documentation and change policy
- **LICENSE** - Architectural Preservation License

## Important Notes

- This is a **sealed implementation** - v1.1 principles are immutable
- Execution is **deterministic** - same inputs always produce byte-identical traces
- The **trace is authoritative** - projections are views, not the truth
- **Self-encoding is complete** - every trace contains its execution environment
- World files are **non-executable** - only identifier-only content allowed
- Projections are **pure functions** - no side effects, no I/O
- Information flows **forward-only** - World → Execution → Trace → Projection
