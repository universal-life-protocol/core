# Repository Structure

**Current organization after moving applications and documentation to dedicated directories**

## Top-Level Organization

```
universal-life-protocol/
├── CLAUDE.md              # Main guidance for Claude Code
├── AGENTS.md              # Quick reference for all agents
│
├── ulp-v3.0/              # Platform-agnostic POSIX/awk core (current)
├── ulp-v2.0/              # v2.0 reference implementation (core only)
├── ulp-v1.1/              # Sealed v1.1 implementation (core only)
│
├── apps/                  # All application implementations
│   ├── core -> ../ulp-v3.0/   # Symlink to current dev version (application context)
│   └── ...                # Other applications
│
├── docs/                  # Web-facing documentation (HTML)
├── dev-docs/              # Development documentation
├── production-docs/       # High-level production documentation
│
└── archive/               # Historical implementations
```

## Core Implementations (Pure Execution Engines)

### `ulp-v3.0/` - Platform-Agnostic POSIX/awk Core
**Status**: Current development, formalized algebra

```
ulp-v3.0/
├── bin/                   # Core execution tools (run.sh, poly.awk, canon.sh, etc.)
├── world/                 # Example world dotfiles
├── interrupts/            # Example interrupt handlers
├── examples/              # Example traces and views
├── test_conformance.sh    # Conformance test suite
├── test_determinism.sh    # Determinism verification
├── ULP-v3.0-SPEC.md       # Formal specification
├── ULP-v3.0-GRAMMAR.md    # Grammar specification
├── ULP-v3.0-VIEW.md       # View model specification
├── USER-GUIDE.md          # User guide
└── AGENTS.md              # v3.0-specific guidance
```

### `ulp-v2.0/` - v2.0 Reference Implementation
**Status**: Reference implementation (core execution only, apps extracted)

```
ulp-v2.0/
├── bin/                   # Core execution tools (run.sh, policy.sh, geometry.sh, etc.)
├── world/                 # Example world dotfiles
├── interrupts/            # Interrupt handlers
├── network/               # Network-related dotfiles
├── test_determinism.sh    # Determinism test
└── README.md              # v2.0 documentation
```

### `ulp-v1.1/` - Sealed v1.1 Implementation
**Status**: Sealed (frozen architecture, core only, demos/apps extracted)

```
ulp-v1.1/
├── bin/                   # Core execution tools (run.sh, proc.awk, canon.awk, etc.)
├── world/, worlds/        # Example world dotfiles
├── interrupts/            # Interrupt handlers
├── projections/           # Projection implementations
├── formats/               # Format specifications
├── stories/               # Story-based examples
├── templates/             # World templates
├── validate.sh            # Validation script
├── README.md              # v1.1 documentation
└── QUICKSTART.md          # Quick start guide
```

## Applications Directory

### `apps/` - All Application Implementations

```
apps/
├── core -> ../ulp-v3.0/   # Symlink to current dev version (application context)
│
├── testament-trustee/     # Ministry project (Rumsfeld matrix, WebAuthn, PWA)
│   ├── matrix-tool/       # Web-based matrix builder
│   ├── p2p-server/        # WebRTC trace sharing
│   ├── recording-pipeline/
│   ├── trace-queries/
│   └── website/
│
├── ulp-chat/              # Express + Ollama LLM chat with ULP traces
│   ├── bin/               # Key generation, verification scripts
│   ├── server.js          # Express backend
│   └── ui/                # Vite frontend
│
├── blackboard-web/        # MQTT-based collaborative trace sharing
│   ├── src/               # TypeScript source
│   └── dist/              # Built assets
│
├── trace-chat/            # Trace-based chat application
│
├── p2p-server/            # Web-based P2P server (PWA + WebRTC)
│   ├── server/            # Service worker, manifest
│   └── README.md
│
├── p2p-server-node/       # Node.js P2P signaling server
│   ├── server.js
│   └── README.md
│
├── ulp-sdk/               # JavaScript SDK for ULP traces
│   ├── src/
│   └── package.json
│
├── ulp-v1.1-mcp-server/   # Model Context Protocol server for ULP Studio
│   ├── index.js
│   ├── mcp.json
│   └── README.md
│
├── ulp-v1.1-demos/        # v1.1 demonstration traces
│   └── conversation-series/
│       ├── 01-five-invariants.trace
│       ├── 02-trace-as-machine.trace
│       ├── 03-projections.trace
│       ├── 04-networking.trace
│       └── README.md
│
└── ulp-v1.1-conversation-demo/  # v1.1 conversation workspace
```

## Documentation Directories

### `production-docs/` - High-Level Documentation

```
production-docs/
├── ONE-PAGE-SUMMARY.md        # Quick ULP overview
├── WHY-ULP-MATTERS.md         # Vision and use cases
├── COMPARISON-MATRIX.md       # ULP vs. other systems
├── VERSION-EVOLUTION.md       # How v1.1 → v2.0 → v3.0 relate
└── Conversation-Series/       # Tutorial content
```

### `dev-docs/` - Development Documentation

```
dev-docs/
├── Architecture/              # Architecture design docs
│   ├── ESP32 ULP Trace Recorder.md
│   ├── BIP-32 Key Derivation as a Chat.md
│   ├── Anchoring each ladder to the four Hopf fibrations.md
│   └── ...
│
├── Core/                      # Core concept documentation
│   ├── Final Champion.md
│   ├── Final Metaverse.md
│   ├── Final Seal.md
│   ├── Final Projection.md
│   └── ...
│
├── v1/                        # v1.1 development docs
│   ├── CHANGELOG.md
│   ├── COMPARISON-MATRIX.md
│   ├── DEMONSTRATION.md
│   └── ...
│
├── v2/                        # v2.0 development docs
│
├── v3/                        # v3.0 development docs
│   ├── ULP v2.0 Execution Algebra.md
│   ├── ULP Execution Algebra Reference Repository.md
│   └── ...
│
├── ULP-v1.1-ARCHITECTURE.txt  # Sealed v1.1 architecture spec
├── ULP-v1.1-SEAL.md           # v1.1 sealing documentation
├── ULP-v2.0-SPECIFICATION.md  # v2.0 formal specification
├── Executive Summary.md       # Executive overview
├── Projection Demo.md         # Projection demonstration
└── CLAUDE.md                  # Legacy (redirects to root)
```

### `docs/` - Web-Facing Documentation

```
docs/
├── index.html             # Landing page
├── studio.html            # ULP Conversation Studio
├── studio.js              # Studio JavaScript
├── viewer.html            # Trace viewer
├── ar-experience.html     # AR experience
├── projections/           # Projection examples
└── README.md              # Web docs README
```

## Design Rationale

### Core Directories (ulp-v1.1, ulp-v2.0, ulp-v3.0)
- **Contain only execution engines**: Pure POSIX shell + awk implementations
- **No applications**: Applications moved to `apps/`
- **No Node.js/Python dependencies**: Platform-agnostic, minimal dependencies
- **Frozen or reference**: v1.1 sealed, v2.0 reference, v3.0 active development

### Apps Directory
- **All user-facing applications**: Web apps, servers, SDKs, demos
- **May have dependencies**: Node.js, npm, MQTT, etc.
- **Version-specific apps preserved**: e.g., `ulp-v1.1-mcp-server`, `ulp-v1.1-demos`
- **Shared across versions**: `ulp-sdk` works with all versions
- **`apps/core/` symlink**: Points to current development version (ulp-v3.0) for application context access

### Documentation Directories
- **production-docs/**: Polished, user-facing documentation for understanding ULP
- **dev-docs/**: Developer-focused specs, architecture docs, version-specific details
- **docs/**: Web deployment (GitHub Pages, HTML interfaces)
- **Version docs in-place**: Each version directory has its own README, SPEC, etc.

## Key Files at Root

```
/CLAUDE.md                 # Main guidance for Claude Code (this is authoritative)
/AGENTS.md                 # Quick reference for agents
/REPOSITORY-STRUCTURE.md   # This file
```

## Application Context Access

The current development version (ulp-v3.0) can be accessed as an application context via:

```
apps/core -> ../ulp-v3.0/  # Symlink for application-oriented usage
```

This allows applications to reference the core execution engine consistently without hardcoding version numbers. For example:
- `cd apps/core && ./bin/run.sh world out`
- Applications can use `../core/bin/` relative paths

## Migration History

1. **P2P and SDK extraction** (ulp-v2.0 → apps):
   - `ulp-v2.0/p2p-server/` → `apps/p2p-server/`
   - `ulp-v2.0/p2p-server-node/` → `apps/p2p-server-node/`
   - `ulp-v2.0/ulp-sdk/` → `apps/ulp-sdk/`

2. **v1.1 applications extraction** (ulp-v1.1 → apps):
   - `ulp-v1.1/mcp-server/` → `apps/ulp-v1.1-mcp-server/`
   - `ulp-v1.1/demos/` → `apps/ulp-v1.1-demos/`
   - `ulp-v1.1/conversation_demo/` → `apps/ulp-v1.1-conversation-demo/`

3. **Documentation consolidation** (ulp-v1.1 → root):
   - `ulp-v1.1/docs/` → `docs/` (web-facing HTML)
   - `ulp-v1.1/dev-docs/` → `dev-docs/` (development docs)
   - High-level docs already at `production-docs/`

4. **Core symlink repositioning** (root → apps):
   - `core -> ulp-v3.0/` → `apps/core -> ../ulp-v3.0/`
   - Rationale: Treat core as application context, accessible alongside other apps
   - Benefit: Applications can reference `../core/` for current development version

## Result

- **Core implementations are pure**: Only execution engines, no applications
- **Applications are centralized**: All in `apps/`, easy to find
- **Documentation is organized**: Three tiers (production, development, web)
- **Version independence**: Each version is self-contained but shares applications
