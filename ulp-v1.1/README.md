# Universal Life Protocol v1.1

**A sealed trace calculus where execution IS trace construction**

[![Architecture Hash](https://img.shields.io/badge/architecture-9872936e-blue.svg)](ULP-v1.1-ARCHITECTURE.txt)
[![Status](https://img.shields.io/badge/status-SEALED-green.svg)](ULP-v1.1-SEAL.md)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen.svg)](CHANGELOG.md)

## Table of Contents

- [What is ULP?](#what-is-ulp)
- [Why ULP?](#why-ulp)
- [The Five Immutable Principles](#the-five-immutable-principles)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Pattern_Syntax](#pattern_syntax)
- [Trace Format](#trace-format)
- [Examples](#examples)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Sealed Vocabulary Sets](#sealed-vocabulary-sets)
- [Architecture Hash](#architecture-hash)
- [Requirements](#requirements)
- [Installation](#installation)
- [License](#license)
- [Contributing](#contributing)
- [Philosophy](#philosophy)
- [Quick Reference](#quick-reference)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

## What is ULP?

ULP (Universal Life Protocol) is a **paradigm shift in computing** where:

- **Execution = Trace Construction** (not "programs produce traces")
- **The Trace is the Machine** (not "a log of machine state")
- **POSIX/Browsers are Projections** (not "runtimes")

**Traditional computing:**
```
Program → Runtime → Effects → (maybe) Logs
```

**ULP computing:**
```
World → Execution → TRACE → Projections
```

## Why ULP?

ULP solves fundamental problems in software:

**Problem: "Works on my machine"**
- Solution: Deterministic traces are byte-identical across all machines, forever

**Problem: Irreproducible bugs**
- Solution: Traces are perfect recordings - replay any execution byte-for-byte

**Problem: Vendor lock-in**
- Solution: The trace is authoritative, not any particular runtime or platform

**Problem: Lost execution context**
- Solution: Self-encoding traces contain their complete execution environment

**Problem: Time-travel debugging is hard**
- Solution: Traces are immutable history - jump to any moment instantly

**Use Cases:**
- **Reproducible builds** - Prove builds are deterministic
- **Forensic analysis** - Perfect audit trails for security/compliance
- **Scientific computing** - Guaranteed reproducibility of research
- **Distributed systems** - Cryptographically verifiable execution
- **Time-travel debugging** - Replay and inspect any execution state

## The Five Immutable Principles

1. **Trace is Append-Only and Authoritative** - Ground truth, never mutated
2. **World Definition is Non-Executable** - Identifier-only data, no control flow
3. **Projections are Pure Functions** - Read-only views, no side effects
4. **Effects are Forward-Only via .interpose** - Declarative event → effect mapping
5. **Information Flows Forward-Only** - Causal ordering preserved

These principles are **sealed** - breaking any requires a version bump.

## Quick Start

**Get started in 60 seconds:**

```bash
# 1. Navigate to ULP directory
cd ulp-v1.1

# 2. Verify installation
./validate.sh

# 3. Create your first trace
echo "hello world" | ./bin/run.sh world out

# 4. View the result
./bin/observe.sh world out/trace.log

# 5. Verify determinism (same input → identical trace)
echo "hello world" | ./bin/run.sh world out2
cmp out/trace.log out2/trace.log && echo "✓ Byte-identical!"

# 6. Verify self-encoding (trace contains everything needed to reproduce)
./bin/decode_trace.sh out/trace.log reconstructed/
echo "hello world" | ./bin/run.sh reconstructed/WORLD reconstructed/out
cmp out/trace.log reconstructed/out/trace.log && echo "✓ Perfect reproduction!"
```

**Next:** See [QUICKSTART.md](QUICKSTART.md) for detailed tutorials and examples.

## Architecture

### Directory Structure

```
world/              World definition (14 dotfiles - closed set)
├── .genesis        Identity and version
├── .env            Environment declarations
├── .atom           Primitive values
├── .manifest       File inventory
├── .schema         Type definitions
├── .sequence       Ordered execution
├── .include        Included files
├── .ignore         Excluded patterns
├── .procedure      Pattern_Syntax execution structure
├── .interrupt      Interrupt handler mappings
├── .view           Observation declarations
├── .record         Trace event schemas
├── .interpose      Event → effect mappings
└── .projection     Projection definitions

interrupts/         Interrupt handlers (shell scripts)
├── PRINT.sh        Output handler
├── ECHO.sh         Echo handler
├── UPPERCASE.sh    Text transformation
├── REVERSE.sh      String reversal
└── COUNT.sh        Line counter

bin/                Core utilities
├── run.sh          Main trace construction engine
├── observe.sh      Pure projection application
├── self_encode.sh  Self-encoding bundle generator
├── decode_trace.sh Trace → files reconstruction
├── validate_world.sh World invariant checker
├── verify_architecture.sh Architecture validator
├── hash.sh         Portable SHA-256
├── canon.awk       Identifier-only validator
├── proc.awk        Pattern_Syntax parser
└── trace.awk       Trace formatting utilities

out/                Output directory (traces)
└── trace.log       Append-only execution trace
```

## Features

### Deterministic Execution

Same inputs → byte-identical traces. Always.

```bash
# Test determinism
for i in 1 2 3; do
    echo "test" | ./bin/run.sh world "out$i"
done
cmp out1/trace.log out2/trace.log && echo "Deterministic!" ✓
```

### Self-Encoding

Every trace contains its complete execution environment:

```bash
# Extract world definition from trace
./bin/decode_trace.sh out/trace.log reconstructed/

# Look at what was extracted
ls reconstructed/WORLD/      # World dotfiles
ls reconstructed/REPO/bin/   # Execution engine

# Re-execute from reconstructed world
cd reconstructed/REPO
echo "test" | ./bin/run.sh ../WORLD out

# Verify traces are byte-identical
cmp out/trace.log <original_path>/out/trace.log && echo "✓ Perfect reproduction!"
```

### Pure Projections

Transform traces without side effects:

```bash
# POSIX projection (stdout text)
./bin/observe.sh world out/trace.log

# JSON projection (structured data)
awk -f bin/project_json.awk out/trace.log

# HTML projection (visual rendering)
awk -f bin/project_html.awk out/trace.log > output.html
```

### Cryptographic Verification

```bash
# Compute World ID (WID)
cat world/.* | ./bin/hash.sh

# Verify trace integrity
grep "^SEAL" out/trace.log | grep semantic_hash
grep -v "^#METADATA" out/trace.log | ./bin/hash.sh
```

## Pattern_Syntax

ULP uses delimiter-based scope syntax with **multiset validation** (order-independent delimiter matching):

```
procedure demo
(([                    # Open:  ( ( [  → multiset: [((
interrupt PRINT
[((                    # Close: [ ( (  → multiset: [((  ✓ Match!
```

**Key insight:** Opening `(([` and closing `[((` contain the same delimiters when sorted, so they form a valid scope.

**Multiset validation:**
- Extract delimiters from opening and closing signatures
- Sort both sets of characters
- Verify they match (order-independent)

**Examples:**
```bash
# Valid patterns
(([  ... [((    # Sorted: [(( = [((  ✓
([[  ... ]])    # Sorted: [[] = [[]  ✓
()() ... ()()   # Sorted: (()) = (())  ✓

# Invalid patterns
(([  ... ]()    # Sorted: [(( ≠ ()]  ✗
([[  ... )]     # Sorted: [[] ≠ )]   ✗
```

This is validated by `bin/proc.awk` during world validation.

## Trace Format

```
#METADATA version ULP/1.1
#METADATA architecture_hash 9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd

HDR    version    1
WORLD  wid        <sha256_hash>

BEGIN  encoding
FILE   path WORLD/.genesis  sha256 <hash>  mode 644  bytes 89
DATA   dXNlciBicmlhbg...  # base64 encoded
END_FILE path WORLD/.genesis
END    encoding

BEGIN  input
STDIN  n 1  text  hello world
END    input

BEGIN  execution
CLAUSE qid <hash>  openSig (([  closeSig ]((  intr PRINT
EXEC   eid <hash>  wid <hash>  qid <hash>  intr PRINT
STDOUT n 1  text  HELLO WORLD
EXIT   intr PRINT  code 0
END    execution

SEAL   semantic_hash  <sha256_of_trace_without_metadata>
SEAL   wid            <world_hash>
```

## Examples

### Example 1: Hello World

Create a simple interrupt that outputs text:

```bash
# Create interrupt handler
cat > interrupts/HELLO.sh << 'EOF'
#!/bin/sh
echo "Hello, ULP!"
EOF
chmod +x interrupts/HELLO.sh

# Update world definition
echo "HELLO" >> world/.include
echo "interrupt HELLO" >> world/.interrupt

# Execute
echo "" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
# Output: Hello, ULP!
```

### Example 2: Text Transformation

Process stdin with an uppercase transformation:

```bash
# Create transformation interrupt
cat > interrupts/UPPER.sh << 'EOF'
#!/bin/sh
tr '[:lower:]' '[:upper:]'
EOF
chmod +x interrupts/UPPER.sh

# Add to world
echo "UPPER" >> world/.include
echo "interrupt UPPER" >> world/.interrupt

# Execute
echo "hello ulp" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
# Output: HELLO ULP
```

### Example 3: Self-Encoding Verification

Demonstrate perfect reproducibility:

```bash
# Create trace
echo "reproducible" | ./bin/run.sh world out

# Extract embedded world and tools
./bin/decode_trace.sh out/trace.log reconstructed/

# Re-execute from extracted files
cd reconstructed/REPO
echo "reproducible" | ./bin/run.sh ../WORLD out2

# Verify byte-identical
cmp out2/trace.log ../../out/trace.log && echo "✓ Perfect!"
```

**More examples:** See [QUICKSTART.md](QUICKSTART.md) and [demos/conversation-series/](demos/conversation-series/) for comprehensive tutorials.

## Validation

```bash
# Run complete test suite
./validate.sh

# Tests include:
# ✓ World definition validation
# ✓ Trace construction
# ✓ Self-encoding completeness
# ✓ Deterministic reproduction
# ✓ Reconstruction from trace
# ✓ Architecture invariant verification
```

## Troubleshooting

### Trace not created?

```bash
# Validate world definition
./bin/validate_world.sh world

# Common issues:
# - .procedure has unbalanced Pattern_Syntax delimiters
# - World files contain non-identifier content (control flow forbidden)
# - Interrupt handler not executable (check with: ls -l interrupts/)
# - Interrupt not listed in .include
```

### Traces not deterministic?

```bash
# Interrupt handlers must be pure - no randomness, timestamps, or network
# Test the interrupt directly:
echo "test input" | ./interrupts/YOUR_INTERRUPT.sh

# Forbidden in interrupts:
# - $(date) or timestamps
# - $RANDOM or random numbers
# - Network calls (curl, wget, nc)
# - File system reads (other than stdin)
```

### "Permission denied" errors?

```bash
# Make scripts executable
chmod +x bin/*.sh
chmod +x interrupts/*.sh

# Verify with:
./bin/verify_architecture.sh
```

### "Command not found: sha256sum"?

```bash
# bin/hash.sh tries multiple commands. Ensure you have one:
which sha256sum   # Linux
which shasum      # macOS/BSD
which openssl     # Fallback (all platforms)
```

### Wrong architecture hash?

```bash
# Verify the canonical architecture file
sha256sum ULP-v1.1-ARCHITECTURE.txt

# Should output:
# 9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd

# If different, the architecture file may be modified
```

### Can't reconstruct from trace?

```bash
# Check self-encoding is present
grep "^BEGIN.*encoding" out/trace.log
grep "^FILE" out/trace.log | wc -l    # Should show multiple files
grep "^DATA" out/trace.log | wc -l    # Should show data lines

# Try manual decode
./bin/decode_trace.sh out/trace.log /tmp/test_decode
ls -la /tmp/test_decode/WORLD/
ls -la /tmp/test_decode/REPO/
```

## Documentation

- [ULP-v1.1-ARCHITECTURE.txt](ULP-v1.1-ARCHITECTURE.txt) - Canonical specification (source of architecture hash)
- [ULP-v1.1-SEAL.md](ULP-v1.1-SEAL.md) - Verification procedures and change policy
- [QUICKSTART.md](QUICKSTART.md) - Step-by-step tutorials (highly recommended!)
- [CLAUDE.md](CLAUDE.md) - Guide for AI assistants working with this codebase
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [demos/conversation-series/](demos/conversation-series/) - Educational traces explaining ULP concepts

## Sealed Vocabulary Sets

### 14 World File Types (Closed Set)
.genesis, .env, .atom, .manifest, .schema, .sequence, .include, .ignore, .procedure, .interrupt, .view, .record, .interpose, .projection

### 16 Trace Event Types (Closed Set)
HDR, WORLD, FILE, DATA, END_FILE, STDIN, CLAUSE, EXEC, EVENT, STDOUT, STDERR, EXIT, ERROR, BEGIN, END, SEAL

### 16 Projection Classes (Closed Set)
posix, json, markdown, pure, w3c_html, w3c_dom, w3c_css, webgl_3d, canvas_2d, vulkan, bip32, bip39, graph, network_graph, print, raw, canonical

## Architecture Hash

```
9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd
```

This hash seals the v1.1 architecture. Any changes that break the Five Principles require a new version.

Verify:

```bash
sha256sum ULP-v1.1-ARCHITECTURE.txt
```

## Requirements

- POSIX shell (sh, bash, dash)
- awk (gawk, mawk, nawk, busybox awk)
- One of: sha256sum, shasum, or openssl (for hashing)
- Standard utilities: cat, grep, sed, sort, cmp

Tested on:
- Linux (Ubuntu, Debian, Alpine)
- Android (Termux)
- macOS
- BSD variants

## Installation

```bash
# Clone or extract to desired location
cd /path/to/ulp-v1.1

# Verify installation
./validate.sh

# Optional: Add to PATH
echo 'export PATH=$PATH:/path/to/ulp-v1.1/bin' >> ~/.bashrc
```

## License

This implementation is released under the **Architectural Preservation License**, which requires:

1. Preservation of all 5 core principles
2. Maintenance of authority hierarchy (trace > world > projections)
3. Respect for closed vocabulary sets
4. Breaking version number for architectural changes

See [LICENSE](LICENSE) for full terms.

## Contributing

We welcome contributions that preserve the Five Principles. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Critical:** Any change that violates the Five Principles MUST be released as v2.0+, not v1.x.

## Philosophy

### "The Trace is the Machine"

In traditional computing, we think of programs running on machines and producing logs. ULP inverts this:

- The **trace** is the authoritative record of what happened
- **Projections** (POSIX stdout, HTML rendering, etc.) are views of the trace
- **Execution** is the process of constructing the trace
- **World** is the immutable definition of what can happen

This paradigm shift enables:
- Perfect reproducibility (same trace, always)
- Cryptographic verification (hash the trace)
- Time-travel debugging (replay any moment)
- Projection interchangeability (use any view you prefer)
- No vendor lock-in (trace is the truth, not any particular runtime)

### Why Sealed?

The Five Principles are sealed to prevent architectural drift. Without immutability:
- Determinism guarantees erode
- Reproducibility becomes unreliable
- Security properties weaken
- "Works on my machine" problems return

The seal ensures ULP v1.1 traces work identically in 2025 and 2045.

## Quick Reference

### Common Commands

```bash
# Execute trace
echo "input" | ./bin/run.sh world out

# View trace
./bin/observe.sh world out/trace.log

# Validate world
./bin/validate_world.sh world

# Run all tests
./validate.sh

# Decode trace
./bin/decode_trace.sh out/trace.log dest/

# Compute hash
./bin/hash.sh < file

# Verify determinism
echo "test" | ./bin/run.sh world out1
echo "test" | ./bin/run.sh world out2
cmp out1/trace.log out2/trace.log
```

### Important Files

```bash
world/.procedure      # Execution structure (Pattern_Syntax)
world/.interrupt      # Interrupt declarations
world/.genesis        # World identity metadata
out/trace.log         # The trace (ground truth)
bin/run.sh            # Trace construction engine
bin/observe.sh        # Projection dispatcher
```

### Trace Inspection

```bash
# View specific record types
grep "^HDR" out/trace.log       # Headers
grep "^WORLD" out/trace.log     # World identity
grep "^STDIN" out/trace.log     # Input
grep "^STDOUT" out/trace.log    # Output
grep "^EXEC" out/trace.log      # Execution events
grep "^SEAL" out/trace.log      # Cryptographic seals
```

## Contact

- **Author**: Brian Thorne
- **Email**: brian@universal-life-protocol.com
- **Repository**: https://github.com/universal-life-protocol/ulp
- **Architecture Discussion**: https://github.com/universal-life-protocol/ulp/discussions

## Acknowledgments

ULP builds on ideas from:
- Lambda calculus and process calculi
- Functional reactive programming
- Capability-based security
- Reproducible builds movement
- Content-addressed storage systems

---

**Remember**: The trace is not a log. The trace IS the machine.

*"Execution truth is written once, observed infinitely."*
