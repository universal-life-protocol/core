# Universal Life Protocol v1.1

**A sealed trace calculus where execution IS trace construction**

[![Architecture Hash](https://img.shields.io/badge/architecture-9872936e-blue.svg)](ULP-v1.1-ARCHITECTURE.txt)
[![Status](https://img.shields.io/badge/status-SEALED-green.svg)](ULP-v1.1-SEAL.md)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen.svg)](CHANGELOG.md)

## What is ULP?

ULP (Universal Life Protocol) is a paradigm shift in computing where:

- **Execution = Trace Construction** (not "programs produce traces")
- **The Trace is the Machine** (not "a log of machine state")
- **POSIX/Browsers are Projections** (not "runtimes")

Traditional computing: `Program → Runtime → Effects → (maybe) Logs`

ULP computing: `World → Execution → TRACE → Projections`

## The Five Immutable Principles

1. **Trace is Append-Only and Authoritative** - Ground truth, never mutated
2. **World Definition is Non-Executable** - Identifier-only data, no control flow
3. **Projections are Pure Functions** - Read-only views, no side effects
4. **Effects are Forward-Only via .interpose** - Declarative event → effect mapping
5. **Information Flows Forward-Only** - Causal ordering preserved

These principles are **sealed** - breaking any requires a version bump.

## Quick Start

```bash
# 1. Create a simple world
cd ulp-v1.1
echo "hello world" | ./bin/run.sh world out

# 2. View the trace
./bin/observe.sh world out/trace.log

# 3. Verify determinism
echo "hello world" | ./bin/run.sh world out2
cmp out/trace.log out2/trace.log  # Byte-identical!
```

See [QUICKSTART.md](QUICKSTART.md) for more examples.

## Architecture

```
world/              World definition (13 dotfiles)
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

# Re-execute from reconstructed world
echo "test" | ./bin/run.sh reconstructed/WORLD reconstructed/out

# Traces are byte-identical!
cmp out/trace.log reconstructed/out/trace.log ✓
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

ULP uses delimiter-based scope syntax with multiset validation:

```
procedure demo
(([                    # Open: ((, [
interrupt PRINT
](())                  # Close: ], ((, )  → multiset matches (([
```

Validation ensures opening and closing delimiters match as multisets (order-independent).

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

### Hello World

```bash
cat > interrupts/HELLO.sh << 'EOF'
#!/bin/sh
echo "Hello, ULP!"
EOF
chmod +x interrupts/HELLO.sh

echo "interrupt HELLO" >> world/.interrupt
echo "" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
# Output: Hello, ULP!
```

### Text Processing Pipeline

```bash
echo "hello ulp world" | ./bin/run.sh world out
# Trace contains complete execution history
# Can project to POSIX, JSON, HTML, etc.
```

See [demos/conversation-series/](demos/conversation-series/) for comprehensive examples.

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

## Documentation

- [ULP-v1.1-ARCHITECTURE.txt](ULP-v1.1-ARCHITECTURE.txt) - Canonical specification (source of architecture hash)
- [ULP-v1.1-SEAL.md](ULP-v1.1-SEAL.md) - Verification procedures and change policy
- [QUICKSTART.md](QUICKSTART.md) - Step-by-step tutorials
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [demos/conversation-series/](demos/conversation-series/) - Educational traces explaining ULP concepts

## Sealed Vocabulary Sets

### 13 World File Types (Closed Set)
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
