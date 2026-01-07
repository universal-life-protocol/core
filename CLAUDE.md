# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Universal Life Protocol (ULP) is a deterministic execution protocol that creates self-encoding, verifiable traces from simple dotfile-defined worlds. The repository contains three major versions plus application implementations:

- **`ulp-v3.0/`** - Platform-agnostic POSIX/awk core with formal execution algebra (current development)
- **`ulp-v2.0/`** - v2.0 reference implementation (core execution only)
- **`ulp-v1.1/`** - Sealed v1.1 implementation (frozen architecture, core only)
- **`apps/`** - Application implementations (Testament Trustee, ULP Chat, Blackboard Web, P2P servers, SDK, MCP server, demos)
  - **`apps/core/`** - Symlink to current development version (`ulp-v3.0/`) for application context
- **`docs/`**, **`dev-docs/`**, **`production-docs/`** - Three tiers of documentation

**For detailed repository structure**, see `REPOSITORY-STRUCTURE.md`.

## Core Principle

**"The trace is the machine. Everything else is a view."**

Execution constructs append-only traces where:
1. **(BALL + input) → POINT**: World definition (BALL) + stdin fully determines the trace (POINT)
2. Traces are deterministic - identical inputs produce byte-identical outputs
3. Traces are self-encoding - they contain the complete recipe to reproduce themselves
4. Projections are pure functions that view traces, never mutate them

## Essential Commands

### Using Current Development Core (via `apps/core/`)

The `apps/core/` symlink provides application-context access to the current development version:

```bash
cd apps/core

# Execute trace (same as ulp-v3.0)
printf 'hello\nworld\n' | ./bin/run.sh world out

# Applications can reference core consistently
cd apps/ulp-chat
node server.js  # Can use ../core/bin/ paths
```

### ULP v3.0 (Primary Development)

```bash
cd ulp-v3.0

# Execute trace
printf 'hello\nworld\n' | ./bin/run.sh world out

# Test determinism (must be byte-identical)
sh ./test_determinism.sh

# Run conformance suite
sh ./test_conformance.sh

# Render view model
sh ./bin/view_model.sh examples/quadrants-octree.view examples/trace-quadrants.json /tmp/view-model.json

# Check policy/geometry/replica metadata
grep "^POLICY\|^GEOMETRY\|^REPLICA" out/trace.log
```

### ULP v2.0

```bash
cd ulp-v2.0

# Execute trace
echo -e 'hello\nworld' | ./bin/run.sh world out

# Test determinism
./test_determinism.sh
```

### ULP v1.1 (Sealed)

```bash
cd ulp-v1.1

# Execute trace
echo "hello world" | ./bin/run.sh world out

# Validate system invariants
./validate.sh

# Reconstruct from trace (self-encoding)
./bin/decode_trace.sh out/trace.log /tmp/reconstructed

# View trace using projection
./bin/observe.sh world out/trace.log
```

## Architecture

### Three-Version Evolution

The repository contains **three parallel implementations** representing an **evolving specification**, not a linear code inheritance. Each version shares the same core principles but explores different formalizations and extensions.

**v1.1 (Sealed)**: Original sealed trace calculus with five immutable principles:
1. Trace is Ground Truth
2. World is Non-Executable
3. Projections are Pure
4. Effects are Forward-Only
5. Information Flows Forward (World → Execution → Trace → Projection)

**v2.0**: Extends v1.1 with symmetry-based policy derivation via E8×E8 lattice, network protocol (`ulp://`), and formal BALL/POINT terminology. Preserves v1.1 core execution model while adding geometric routing and deterministic replication.

**v3.0**: Platform-agnostic POSIX/awk core that refines v1.1 and v2.0 with:
- Canonical Polynomial Normal Form (CPNF) for deterministic WID hashing
- Formal execution algebra (open envelope, weighted degree, shadow matching)
- Conformance test suite and view model renderer
- Includes v2.0's policy layer, excludes network implementation (moved to `apps/`)

**For detailed version relationships**, see `docs/VERSION-EVOLUTION.md`.

### Key Concepts

**World Dotfiles** (non-executable authority):
- `.genesis` - Origin metadata (author, runtime, paradigm)
- `.env` - Environment constraints (stdin, stdout, effects)
- `.atom` - Primitive units with optional weights
- `.manifest` - Component inventory and degree constraints
- `.schema` - Trace structure specification
- `.sequence` - Ordering constraints
- `.include` / `.ignore` - Interrupt allowlist/blocklist
- `.procedure` - Control flow envelope (polynomial constraints)
- `.interrupt` - Event hooks (polynomial fragments per interrupt)
- `.projection` - Pure function declarations
- `.view` - Observer configuration
- `.record` - Recording metadata
- `.interface` (v2+) - Optional projection-only interface definitions
- `.symmetry` (v3) - Symmetry declarations

**World Identity (WID)**: `sha256(canonicalized_dotfiles)` where `.procedure` and `.interrupt` must be in CPNF form.

**Interrupt Handlers** (`interrupts/`): Executable shell scripts (e.g., `PRINT.sh`, `UPPERCASE.sh`) that must be listed in `.include` and not in `.ignore`.

**Trace Format**: Tab-separated records including:
- `HDR`, `BALL` - Header and world identity
- `STDIN`, `STDOUT`, `STDERR` - I/O events
- `CLAUSE`, `EXEC`, `EXIT` - Execution events
- `ALG_*` - Algebra evaluation records (v3)
- `POLICY`, `GEOMETRY`, `REPLICA` - Derived metadata (v2+)
- `MANIFEST`, `FILE`, `DATA`, `END_FILE` - Self-encoding bundle

### CPNF Canonicalization (v3.0)

Canonical Polynomial Normal Form ensures deterministic WID hashing:

1. Combine like monomials by summing coefficients
2. Drop zero coefficients
3. Order terms by: (a) monomial length ascending, (b) lexicographic byte order
4. Serialize as `±c monomial`

**Tools**: `bin/canon.sh` for general dotfiles, `bin/poly.awk` for polynomial processing.

### Execution Algebra (v3.0)

- **Atoms**: Declared in `.atom` with optional weights `w(a)`
- **Monomials**: Ordered sequences like `a1.a2...ak`
- **Envelope**: `.procedure` defines polynomial `E` with mode (`closed`/`open`), sign constraint, and max weighted degree
- **Fragments**: `.interrupt` defines polynomial `I` per interrupt name
- **Admissibility**: Uses first-failure-wins in CPNF order to check:
  - Manifest constraints (max degree, max wdegree, banned prefixes)
  - Envelope containment (closed mode) or shadow matching (open mode)
  - Capacity constraint: `abs(I(m)) <= abs(E(m))` or shadow capacity
  - Sign constraint if `sign=same`

## Key Implementation Files

### Core Execution Engine

**v3.0/v2.0 (POSIX sh + awk)**:
- `bin/run.sh` - Main execution engine
- `bin/poly.awk` - Polynomial algebra processor (v3)
- `bin/canon.sh` - CPNF canonicalization
- `bin/hash.sh` - SHA-256 hashing (portable)
- `bin/self_encode.sh` - Appends self-encoding bundle
- `bin/policy.sh` - E8×E8 policy derivation
- `bin/geometry.sh` - Geometry metadata
- `bin/replica.sh` - Replica slot calculation
- `bin/view_model.sh` - View renderer (v3)

**v1.1 (POSIX sh + awk)**:
- `bin/run.sh` - Main execution engine
- `bin/proc.awk` - Pattern_Syntax parser with multiset validation
- `bin/canon.awk` - Canonicalization
- `bin/decode_trace.sh` - Trace reconstruction
- `bin/observe.sh` - Projection viewer
- `bin/trace.awk` - Trace formatting utilities

### Applications

**Testament Trustee** (`apps/testament-trustee/`):
- Ministry project using ULP traces for theological testimony
- Rumsfeld epistemological matrix (known/unknown × known/unknown)
- WebAuthn + PWA browser interface
- Components: matrix-tool, recording-pipeline, trace-queries, website

**ULP Chat** (`apps/ulp-chat/`):
- Express server with dotfile-gated memory admissions
- Ollama LLM integration
- Vite UI with real-time chat
- Context hashing with optional Ed25519 signatures
- Endpoints: `/chat`, `/explain/:hash`, `/views/*`, `/redact/:claimId`

**Blackboard Web** (`apps/blackboard-web/`):
- MQTT-based collaborative trace sharing
- TypeScript + Vite build
- Real-time trace synchronization

## Development Workflow

### Modifying Code

1. **Identify the version**: Determine if changes apply to v1.1 (sealed), v2.0, or v3.0
2. **Respect frozen principles**: v1.1's five principles are immutable (breaking changes require v2+)
3. **Maintain determinism**: Same inputs must produce byte-identical traces
4. **Keep dotfiles non-executable**: Only identifier-only content, no control flow in world files
5. **Projections must be pure**: No exec/eval/system calls, no I/O, no side effects

### Testing Determinism

```bash
# Generate trace twice
printf "test\n" | ./bin/run.sh world out1
printf "test\n" | ./bin/run.sh world out2

# Must be byte-for-byte identical
cmp out1/trace.log out2/trace.log
```

### Adding New Interrupts

1. Create executable handler: `interrupts/NEW_INTERRUPT.sh`
2. Add to `.include`: `echo "NEW_INTERRUPT" >> world/.include`
3. Update `.interrupt` with polynomial fragment (v3) or declaration (v1.1/v2.0)
4. Update `.procedure` to reference it
5. Test with validation suite

### Debugging Traces

```bash
# View raw trace
cat out/trace.log

# Filter by event type
awk -F '\t' '$1=="STDOUT"' out/trace.log
awk -F '\t' '$1=="EXEC"' out/trace.log
awk -F '\t' '$1=="ALG_ADMIT"' out/trace.log  # v3 algebra

# Decode base64 payloads
awk -F '\t' '$1=="DATA" {print $2}' out/trace.log | base64 -d

# View self-encoding section
awk '/^MANIFEST/,/^END$/' out/trace.log
```

### Working with CPNF (v3.0)

```bash
# Canonicalize a dotfile
sh ./bin/canon.sh world/.procedure

# Check polynomial parsing
awk -f bin/poly.awk world/.interrupt

# Validate world before execution
sh ./bin/run.sh world out 2>&1 | grep -i error
```

## Important Constraints

### Determinism Requirements

- **No timestamps**: Traces must not depend on wall-clock time
- **No randomness**: All execution is deterministic
- **No network literals**: IPs, ports, MACs forbidden in traces
- **Trace-time ordering only**: Events ordered by causality, not real time
- **Canonical sorting**: Dotfiles and polynomials must sort deterministically

### Architectural Invariants

**Frozen in v1.1**:
- Trace is immutable and append-only
- World files are non-executable (identifier-only)
- Projections cannot execute code or perform I/O
- Effect system is a closed algebra
- Information flows forward only (World → Execution → Trace → Projection)

**Extended in v2.0+**:
- Policy derived from E8×E8 lattice (not enumerated)
- Network transport is semantic-agnostic
- Chirality affects ordering, not content
- High symmetry tools are explanatory, not runtime

**Formalized in v3.0**:
- CPNF canonicalization is mandatory for WID
- Execution algebra is table-driven
- Admissibility uses first-failure-wins
- View model is projection-only

## Termux Compatibility

This codebase is developed on Termux (Android). Key considerations:

1. **Use POSIX sh**: Scripts start with `#!/bin/sh` and use `set -eu`
2. **Portable stat**: Handle different implementations in self-encoding
3. **Hash tool detection**: Try `sha256sum`, `shasum`, then `openssl sha256`
4. **Base64 handling**: Use `base64 -d` for decoding
5. **In-memory sorting**: Some awk scripts use temp files instead of `asort()`
6. **No GNU-isms**: Avoid bash-specific features, use portable POSIX constructs

## Documentation Structure

The repository has three documentation directories:

### `production-docs/` - High-Level Documentation
- **ONE-PAGE-SUMMARY.md** - Quick overview of ULP
- **WHY-ULP-MATTERS.md** - Vision and use cases
- **COMPARISON-MATRIX.md** - ULP vs. blockchain, Git, Docker, IPFS, etc.
- **VERSION-EVOLUTION.md** - Detailed explanation of how v1.1 → v2.0 → v3.0 relate and propagate
- **Conversation-Series/** - Tutorial content

### `dev-docs/` - Development Documentation
- **Architecture/** - Architecture design documents (ESP32, BIP-32, Hopf fibrations, trigonometric calculus)
- **Core/** - Core concept docs (Final Champion, Final Metaverse, Final Seal, projections, references)
- **v1/**, **v2/**, **v3/** - Version-specific development documentation
- Top-level specs:
  - `ULP-v1.1-ARCHITECTURE.txt` - Sealed v1.1 architecture specification
  - `ULP-v1.1-SEAL.md` - v1.1 sealing documentation
  - `ULP-v2.0-SPECIFICATION.md` - v2.0 formal specification
  - `Executive Summary.md` - Executive-level overview
  - `Projection Demo.md` - Projection system demonstration

### `docs/` - Web-Facing Documentation
- **HTML interfaces**: `studio.html`, `viewer.html`, `ar-experience.html`, `index.html`
- **projections/** - Projection implementation examples
- Used for GitHub Pages or web deployment

### Version-Specific Documentation
- **ulp-v3.0/**: `ULP-v3.0-SPEC.md`, `ULP-v3.0-GRAMMAR.md`, `ULP-v3.0-VIEW.md`, `USER-GUIDE.md`, `AGENTS.md`
- **ulp-v2.0/**: `README.md`
- **ulp-v1.1/**: `README.md`, `QUICKSTART.md`
- **Root**: `AGENTS.md`, `CLAUDE.md` (this file)

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

# Add .procedure, .interrupt, .manifest, .schema, .sequence, .include, .ignore, .view, .record
# For v3: also add .symmetry
```

### Self-Encoding Verification

```bash
# Generate trace with self-encoding
printf "test\n" | ./bin/run.sh world out

# Extract and reconstruct
./bin/decode_trace.sh out/trace.log /tmp/reconstructed

# Verify determinism
cd /tmp/reconstructed/REPO
printf "test\n" | ./bin/run.sh ../WORLD out2
cmp out2/trace.log <original_trace.log>
```

### Policy/Geometry Inspection (v2+)

```bash
# View derived metadata
grep "^POLICY" out/trace.log
grep "^GEOMETRY" out/trace.log
grep "^REPLICA" out/trace.log

# Manually derive policy
sh ./bin/policy.sh <RID>

# Check chirality
sh ./bin/policy.sh <RID> | awk -F'\t' '$1=="POLICY" {print $3}'
```

## When Working on Applications

### ULP Chat (`apps/ulp-chat/`)

- **Backend**: Express + Ollama, runs on port 3000
- **Frontend**: Vite dev server proxies to backend
- **Key scripts**: `bin/keygen.js`, `bin/verify-context.js`, `bin/verify-signature.js`
- **Environment**: Set `OLLAMA_HOST` and `OLLAMA_MODEL`

### Testament Trustee (`apps/testament-trustee/`)

- **Matrix Tool**: Web-based Rumsfeld matrix builder in `matrix-tool/`
- **P2P Server**: WebRTC-based trace sharing in `p2p-server/`
- **Focus**: Theological testimony preservation, four voices (Solomon/Solon/Ibn Khaldun/Enoch)

### Blackboard Web (`apps/blackboard-web/`)

- **Tech Stack**: TypeScript + Vite + MQTT
- **Build**: `npm run dev` for development, `npm run build` for production
- **Purpose**: Collaborative trace sharing over MQTT

### P2P Servers (`apps/p2p-server/` and `apps/p2p-server-node/`)

- **p2p-server**: Web-based P2P server (PWA + WebRTC)
- **p2p-server-node**: Node.js P2P signaling server
- **Start**: `cd apps/p2p-server-node && npm install && node server.js`
- **Purpose**: Trace sharing and replication over WebRTC

### ULP SDK (`apps/ulp-sdk/`)

- **Purpose**: JavaScript SDK for working with ULP traces
- **Install**: `cd apps/ulp-sdk && npm install`
- **Usage**: Import and use in Node.js or browser applications

### ULP v1.1 MCP Server (`apps/ulp-v1.1-mcp-server/`)

- **Purpose**: Model Context Protocol server for ULP Conversation Studio
- **Features**: Scene management, object manipulation, trace export/import, template resources
- **Install**: `cd apps/ulp-v1.1-mcp-server && npm install`
- **Run**: `npm start` (stdio transport)
- **Integration**: Compatible with Claude Desktop and MCP Inspector

### ULP v1.1 Demos (`apps/ulp-v1.1-demos/`)

- **Purpose**: Example traces and demonstrations from v1.1
- **Contents**: Conversation series traces showcasing five invariants, trace-as-machine, projections, networking
- **Usage**: Reference implementations for understanding ULP v1.1 concepts

## Git Workflow Notes

- Main branch: `main`
- Current status shows modified `.gitignore`
- Recent commits focus on v2.0 and Testament Trustee features
- v1.1 architecture is sealed (hash: `9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd`)
