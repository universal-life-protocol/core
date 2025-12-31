# Changelog

All notable changes to the Universal Life Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to **Architectural Versioning**:
- Major version changes indicate Breaking Changes (violate the Five Principles)
- Minor version changes add features while preserving all principles
- Patch version changes fix bugs without changing semantics

## [1.1.0] - 2025-12-31 - SEALED RELEASE

**Architecture Hash**: `9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd`

**Status**: SEALED - The Five Principles are now immutable. Any Breaking Change requires v2.0+.

### The Five Immutable Principles (Established)

1. **Trace is Append-Only and Authoritative**
   - Trace is ground truth, never mutated
   - Deterministic: same inputs → byte-identical traces
   - Cryptographically verifiable via hash

2. **World Definition is Non-Executable**
   - World files contain identifier-only data
   - No control flow, no eval, no hidden execution
   - Validated by `bin/canon.awk`

3. **Projections are Pure Functions**
   - π(Trace) → View
   - Read-only, no side effects
   - Interchangeable views of same truth

4. **Effects are Forward-Only via .interpose**
   - Declarative EVENT → EFFECT mapping
   - No backward causation
   - Clear authority hierarchy

5. **Information Flows Forward-Only**
   - World → Trace → Projections
   - Causal ordering preserved
   - No information leakage backward

### Added - Core Implementation

#### World Definition System
- **13 World File Types** (closed vocabulary set):
  - `.genesis` - Identity and version
  - `.env` - Environment declarations
  - `.atom` - Primitive values
  - `.manifest` - File inventory
  - `.schema` - Type definitions
  - `.sequence` - Ordered execution
  - `.include` - Included files
  - `.ignore` - Excluded patterns
  - `.procedure` - Pattern_Syntax execution structure
  - `.interrupt` - Interrupt handler mappings
  - `.view` - Observation declarations
  - `.record` - Trace event schemas
  - `.interpose` - Event → effect mappings
  - `.projection` - Projection definitions

- **Identifier-Only Validation** (`bin/canon.awk`)
  - Ensures world files contain no executable code
  - Prevents Turing-complete world specifications
  - Stops hidden malware in definitions

#### Execution Engine

- **Main Trace Constructor** (`bin/run.sh`)
  - World ID (WID) computation via hashing
  - Atomic trace publication with file locking
  - Self-encoding bundle generation
  - Deterministic execution guarantees

- **Pattern_Syntax Parser** (`bin/proc.awk`)
  - Delimiter-based scope parsing: `(`, `[`, `]`, `)`
  - Multiset validation (opening/closing signatures match)
  - Procedure clause extraction
  - Interrupt mapping resolution

- **Self-Encoding System** (`bin/self_encode.sh`)
  - Embeds complete world definition in trace
  - Includes all interrupt handlers
  - Base64 encodes with 76-char line width
  - Enables perfect reconstruction

- **Trace Decoder** (`bin/decode_trace.sh`)
  - Extracts WORLD/ and REPO/ from traces
  - Reconstructs file permissions
  - Enables replay from archive

#### Projection System

- **Pure Observation** (`bin/observe.sh`)
  - POSIX projection: π_posix(trace) → stdout
  - Unescapes STDOUT records
  - Read-only, no side effects

- **16 Projection Classes** (sealed vocabulary):
  - **Text**: posix, json, markdown, pure
  - **Visual**: w3c_html, w3c_dom, w3c_css
  - **3D**: webgl_3d, canvas_2d, vulkan
  - **Identity**: bip32, bip39
  - **Analysis**: graph, network_graph, print
  - **Meta**: raw, canonical

#### Trace Format

- **16 Trace Event Types** (sealed vocabulary):
  - `HDR` - Header metadata
  - `WORLD` - World identity (WID)
  - `FILE` - File record start
  - `DATA` - Base64 file content
  - `END_FILE` - File record end
  - `STDIN` - Input record
  - `CLAUSE` - Procedure clause
  - `EXEC` - Execution instance
  - `EVENT` - Generic event
  - `STDOUT` - Output text
  - `STDERR` - Error text
  - `EXIT` - Execution exit
  - `ERROR` - Error condition
  - `BEGIN` - Section start
  - `END` - Section end
  - `SEAL` - Cryptographic seal

- **Tab-Separated Fields**
  - Canonical format: `TYPE\tfield1\tfield2\t...`
  - Escape sequences: `\\n`, `\\t`, `\\r`, `\\\\`
  - Deterministic ordering

- **Self-Encoding Structure**
  ```
  #METADATA (non-semantic)
  HDR + WORLD (identity)
  BEGIN encoding ... END encoding (world bundle)
  BEGIN input ... END input (stdin)
  BEGIN execution ... END execution (trace events)
  SEAL (hashes)
  ```

#### Validation and Testing

- **World Validator** (`bin/validate_world.sh`)
  - Checks all 13 world file types exist
  - Validates identifier-only content
  - Verifies file permissions
  - Tests Pattern_Syntax parsing

- **Architecture Validator** (`bin/verify_architecture.sh`)
  - Verifies Five Principles adherence
  - Checks closed vocabulary sets
  - Validates hash computations
  - Ensures determinism

- **Test Suite** (`validate.sh`)
  - 8 comprehensive tests
  - World definition validation
  - Trace construction
  - Self-encoding verification
  - Deterministic reproduction
  - Reconstruction from trace
  - Architecture invariant checks

#### Utilities

- **Portable Hashing** (`bin/hash.sh`)
  - Tries sha256sum, shasum, openssl
  - Consistent output format
  - Cross-platform compatibility

- **Trace Utilities** (`bin/trace.awk`)
  - Field extraction helpers
  - Event filtering
  - Format validation

#### Example Interrupts

- `PRINT.sh` - Output handler
- `ECHO.sh` - Echo input
- `UPPERCASE.sh` - Text transformation
- `REVERSE.sh` - String reversal
- `COUNT.sh` - Line counter

### Added - Documentation

- **Architecture Specification** (`ULP-v1.1-ARCHITECTURE.txt`)
  - 692 lines of canonical specification
  - Source of architecture hash
  - Complete principle definitions
  - Closed vocabulary sets
  - Hash computation formulas

- **Seal Document** (`ULP-v1.1-SEAL.md`)
  - Verification procedures
  - Change policy
  - Breaking change guidelines

- **Comprehensive README** (`README.md`)
  - Quick start guide
  - Architecture overview
  - Feature documentation
  - Philosophy and rationale

- **Demonstration Traces** (`demos/conversation-series/`)
  - `01-five-invariants.trace` - Explains core principles
  - `02-trace-as-machine.trace` - Paradigm shift explanation
  - `03-projections.trace` - Projection system documentation
  - `04-networking.trace` - Declarative networking
  - `project_text.py` - Pure Python projection
  - Complete README with viewing methods

### Changed

- **Versioning Scheme**
  - Adopted Architectural Versioning
  - Major = Breaking Changes (violate principles)
  - Minor = Additive features (preserve principles)
  - Patch = Bug fixes (no semantic changes)

### Fixed

- **Termux Compatibility**
  - Changed temp file path from `/tmp` to current directory
  - Works on Android without special permissions
  - Portable across all POSIX systems

- **AWK Syntax**
  - Removed `next` from END blocks
  - Use structured control flow instead
  - Compatible with all awk variants (gawk, mawk, nawk, busybox)

- **Identifier Validation**
  - Version strings use underscores: `v1_1` not `1.1`
  - Strict identifier-only enforcement
  - Prevents period characters in world files

- **Multiset Validation**
  - Correct opening/closing signature matching
  - Order-independent comparison via sort
  - Prevents unbalanced delimiter bugs

### Security

- **Capability-Based Security**
  - World files are non-executable (prevents malware)
  - Projections are pure (prevents exfiltration)
  - Effects are declarative (explicit authorization)

- **Cryptographic Verification**
  - Architecture hash seals the specification
  - Trace semantic hash enables verification
  - World ID (WID) ensures immutable identity

- **Air-Gapped by Default**
  - No network operations in core system
  - Networking requires explicit .network file
  - Topology declared in .connections file

### Performance

- **Deterministic Execution**
  - Same inputs always produce byte-identical traces
  - No timing dependencies
  - No random number generation

- **Efficient Parsing**
  - Single-pass AWK processing
  - Tab-separated fields (fast splitting)
  - Minimal memory footprint

- **Parallel-Friendly**
  - Pure projections can run in parallel
  - Multiple traces can be processed concurrently
  - No shared mutable state

### Platform Support

- **Linux** (Ubuntu, Debian, Alpine, etc.)
- **Android** (Termux)
- **macOS** (Darwin)
- **BSD** (FreeBSD, OpenBSD, NetBSD)

All POSIX-compliant systems with sh/awk/standard utilities.

## Version Numbering Policy

### v1.x Series (Current)
- **SEALED**: The Five Principles are immutable
- **Patch updates** (v1.1.x): Bug fixes only
- **Minor updates** (v1.x.0): Additive features that preserve principles
- **No v1.x release** may violate the Five Principles

### v2.x Series (Future, if needed)
- Would indicate Breaking Changes
- Requires architectural re-evaluation
- Not backward compatible with v1.x traces
- Must document which principles changed and why

### Breaking Changes
A Breaking Change is any modification that:
1. Allows trace mutation (violates Principle 1)
2. Makes world definitions executable (violates Principle 2)
3. Makes projections impure (violates Principle 3)
4. Allows backward effects (violates Principle 4)
5. Allows backward information flow (violates Principle 5)

Breaking Changes **require v2.0+**, not v1.x.

## Migration Guide

### From pre-1.1 implementations

If you have an earlier ULP implementation:

1. **World files**: Ensure version strings use underscores (`v1_1` not `1.1`)
2. **Procedures**: Validate Pattern_Syntax with multiset checking
3. **Traces**: Add architecture hash to #METADATA
4. **Projections**: Verify purity (no side effects)
5. **Effects**: Move to .interpose declarative mapping

### From v1.1.0 to future v1.1.x

Patch releases are backward compatible. Just update:

```bash
cp -a world/ world.backup/
# Update ulp-v1.1 directory
./validate.sh  # Verify compatibility
```

### From v1.x to hypothetical v2.x

Breaking changes would require:
- New world file format (if Principle 2 changes)
- New trace format (if Principle 1 changes)
- Migration tools (provided in v2.0 release)
- Clear documentation of incompatibilities

## Deprecation Policy

### Nothing is deprecated in v1.1

All features are part of the sealed architecture:
- All 13 world file types
- All 16 trace event types
- All 16 projection classes
- All core utilities

### Future deprecations (v1.x)

If a feature must be deprecated while preserving principles:
1. Mark as deprecated in documentation
2. Maintain for at least 2 minor versions
3. Provide migration path
4. Remove only in next major version

## Roadmap

### Planned for v1.1.x (Patch Releases)
- Bug fixes as discovered
- Documentation improvements
- Additional example interrupts
- Extended test coverage
- Platform-specific optimizations

### Possible for v1.2.0 (Minor Release, preserving principles)
- Additional projections (within sealed 16 classes)
- Extended validation tools
- Performance optimizations
- Better error messages
- IDE/editor integrations
- Visualization tools

### NOT planned (would require v2.0+)
- Modifying the Five Principles
- Adding new world file types (vocabulary is sealed)
- Adding new trace event types (vocabulary is sealed)
- Breaking backward compatibility

## References

- **Architecture Specification**: [ULP-v1.1-ARCHITECTURE.txt](ULP-v1.1-ARCHITECTURE.txt)
- **Seal Document**: [ULP-v1.1-SEAL.md](ULP-v1.1-SEAL.md)
- **License**: [LICENSE](LICENSE)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)

## Attribution

**Author**: Brian Thorne
**Email**: brian@universal-life-protocol.com
**Date**: 2025-12-31
**Architecture Hash**: `9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd`

---

**Note**: This is the inaugural sealed release. The Five Principles are now immutable. Any violation requires v2.0+.

*"The trace is the machine. Everything else is a view."*
