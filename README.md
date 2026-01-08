# Universal Life Protocol (ULP)

**A deterministic execution protocol that creates self-encoding, verifiable traces from dotfile-defined worlds.**

> "The trace is the machine. Everything else is a view."

## What Is ULP?

ULP creates digital records that prove their own integrity without trusting anyone. No blockchain, no consensus, no middleman.

**Core concept**: Simple text files (dotfiles) define execution rules. Run them once, get a cryptographically-verifiable trace that includes the complete recipe to reproduce itself.

```bash
# Same input → Same output (byte-for-byte identical)
echo "hello" | ./bin/run.sh world out
# Produces deterministic trace with embedded self-encoding
```

## Key Features

- **Deterministic**: Identical inputs produce byte-identical outputs
- **Self-encoding**: Traces contain the complete recipe to reproduce themselves
- **Verifiable**: Anyone can verify and reproduce the execution
- **Platform-agnostic**: POSIX shell + awk, runs anywhere
- **No dependencies**: No blockchain, no consensus, no central authority

## Quick Start

### ULP v3.0 (Current Development)

```bash
cd ulp-v3.0

# Execute a trace
printf 'hello\nworld\n' | ./bin/run.sh world out

# Test determinism (must be byte-identical)
sh ./test_determinism.sh

# Run conformance suite
sh ./test_conformance.sh
```

### ULP v2.0 (Reference Implementation)

```bash
cd ulp-v2.0

# Execute a trace
echo -e 'hello\nworld' | ./bin/run.sh world out

# Test determinism
./test_determinism.sh
```

### ULP v1.1 (Sealed Architecture)

```bash
cd ulp-v1.1

# Execute a trace
echo "hello world" | ./bin/run.sh world out

# Validate system invariants
./validate.sh

# Reconstruct from trace (self-encoding)
./bin/decode_trace.sh out/trace.log /tmp/reconstructed
```

## Repository Structure

```
universal-life-protocol/
├── ulp-v3.0/              # Current development (POSIX/awk, formal algebra)
├── ulp-v2.0/              # v2.0 reference (E8×E8 policy layer)
├── ulp-v1.1/              # Sealed v1.1 (frozen architecture)
│
├── apps/                  # Application implementations
│   ├── core/              # Symlink to current dev version (ulp-v3.0)
│   ├── testament-trustee/ # Ministry project (WebAuthn + PWA)
│   ├── ulp-chat/          # Express + Ollama LLM chat
│   ├── blackboard-web/    # MQTT-based trace sharing
│   ├── p2p-server/        # WebRTC P2P trace sharing
│   ├── ulp-sdk/           # JavaScript SDK
│   └── ulp-v1.1-mcp-server/ # Model Context Protocol server
│
├── production-docs/       # High-level documentation
├── dev-docs/              # Development documentation
└── docs/                  # Web-facing HTML documentation
```

For detailed structure, see [REPOSITORY-STRUCTURE.md](REPOSITORY-STRUCTURE.md).

## Three Versions Explained

The repository contains **three parallel implementations** representing an **evolving specification**:

- **v1.1 (Sealed)**: Original sealed trace calculus with five immutable principles
- **v2.0**: Extends v1.1 with E8×E8 lattice policy derivation and network protocol
- **v3.0**: Platform-agnostic POSIX/awk core with formal execution algebra (CPNF)

Each version shares core principles but explores different formalizations. See [VERSION-EVOLUTION.md](production-docs/VERSION-EVOLUTION.md) for details.

## Documentation

### Start Here
- [ONE-PAGE-SUMMARY.md](production-docs/ONE-PAGE-SUMMARY.md) - Quick overview
- [WHY-ULP-MATTERS.md](production-docs/WHY-ULP-MATTERS.md) - Vision and use cases
- [COMPARISON-MATRIX.md](production-docs/COMPARISON-MATRIX.md) - ULP vs. blockchain, Git, Docker

### For Developers
- [CLAUDE.md](CLAUDE.md) - Complete development guide
- [ulp-v3.0/ULP-v3.0-SPEC.md](ulp-v3.0/ULP-v3.0-SPEC.md) - v3.0 formal specification
- [dev-docs/ULP-v2.0-SPECIFICATION.md](dev-docs/ULP-v2.0-SPECIFICATION.md) - v2.0 specification
- [ulp-v1.1/README.md](ulp-v1.1/README.md) - v1.1 documentation

### For Users
- [ulp-v3.0/USER-GUIDE.md](ulp-v3.0/USER-GUIDE.md) - v3.0 user guide
- [ulp-v1.1/QUICKSTART.md](ulp-v1.1/QUICKSTART.md) - v1.1 quick start

## Core Concepts

### World Dotfiles (Non-executable Authority)

Worlds are defined by simple text files:
- `.genesis` - Origin metadata (author, runtime)
- `.env` - Environment constraints (stdin, stdout)
- `.atom` - Primitive units with optional weights
- `.manifest` - Component inventory
- `.schema` - Trace structure specification
- `.procedure` - Control flow envelope
- `.interrupt` - Event hooks
- `.projection` - Pure function declarations

### Execution → Trace

```bash
# (WORLD + input) → deterministic TRACE
printf 'input\n' | ./bin/run.sh world out

# Trace contains:
# - Complete execution log
# - Self-encoding bundle (dotfiles + interrupts + code)
# - Cryptographic fingerprint (WID)
```

### Determinism Guarantee

```bash
# Run 1
echo "test" | ./bin/run.sh world out1

# Run 2
echo "test" | ./bin/run.sh world out2

# Must be byte-for-byte identical
cmp out1/trace.log out2/trace.log
```

## Applications

### Testament Trustee
Ministry project using ULP traces for theological testimony. Features WebAuthn + PWA interface and Rumsfeld epistemological matrix.

```bash
cd apps/testament-trustee/website
# See README for deployment
```

### ULP Chat
Express + Ollama LLM chat with dotfile-gated memory admissions.

```bash
cd apps/ulp-chat
npm install
npm start
```

### Blackboard Web
MQTT-based collaborative trace sharing with real-time synchronization.

```bash
cd apps/blackboard-web
npm install
npm run dev
```

### P2P Servers
WebRTC-based peer-to-peer trace sharing.

```bash
# Node.js signaling server
cd apps/p2p-server-node
npm install
node server.js
```

### ULP SDK
JavaScript SDK for working with ULP traces in Node.js or browser.

```bash
cd apps/ulp-sdk
npm install
```

## Development

### Testing Determinism

```bash
cd ulp-v3.0
sh ./test_determinism.sh
```

### Adding New Interrupts

```bash
# 1. Create handler
echo '#!/bin/sh' > interrupts/NEW_INTERRUPT.sh
chmod +x interrupts/NEW_INTERRUPT.sh

# 2. Add to .include
echo "NEW_INTERRUPT" >> world/.include

# 3. Update .interrupt and .procedure
# 4. Test execution
```

### Debugging Traces

```bash
# View raw trace
cat out/trace.log

# Filter by event type
awk -F '\t' '$1=="STDOUT"' out/trace.log
awk -F '\t' '$1=="EXEC"' out/trace.log

# Decode base64 payloads
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d
```

## Key Principles

### Five Immutable Principles (v1.1 Sealed)

1. **Trace is Ground Truth**: The execution trace is the authoritative record
2. **World is Non-Executable**: Dotfiles contain only identifiers, no control flow
3. **Projections are Pure**: Observers cannot execute code or perform I/O
4. **Effects are Forward-Only**: Append-only traces, no mutation
5. **Information Flows Forward**: World → Execution → Trace → Projection

### Architectural Constraints

- **No timestamps**: Traces must not depend on wall-clock time
- **No randomness**: All execution is deterministic
- **No network literals**: IPs, ports, MACs forbidden in traces
- **Canonical sorting**: Dotfiles and polynomials sort deterministically

## Platform Compatibility

Developed on Termux (Android) for maximum portability:
- POSIX sh (not bash)
- Standard awk
- Portable hash tools (sha256sum, shasum, or openssl)
- No GNU-isms, no platform-specific features

## Use Cases

- **AI Transparency**: Verify AI-generated content without trusting the source
- **Reproducible Science**: Share complete methodology in the trace itself
- **Software Security**: Prove binaries match source code
- **Legal Documents**: Cryptographic proof of unmodified contracts
- **Decentralized Applications**: No blockchain, no consensus needed

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) for complete development guidelines
2. Respect version boundaries (v1.1 is sealed, v2.0 is reference)
3. Maintain determinism (same input → same output)
4. Keep dotfiles non-executable (identifier-only content)
5. Test thoroughly with determinism suite

## License

Open source (see LICENSE file)

## Contact & Support

- Issues: GitHub Issues
- Documentation: See `production-docs/`, `dev-docs/`, and version-specific READMEs
- Web: [coming soon]

---

**Don't trust this README. Verify the code.**

```bash
cd ulp-v3.0
printf 'test\n' | ./bin/run.sh world out
# You just created a self-proving record
```

*If you can't verify it, you can't trust it. ULP makes verification free.*
