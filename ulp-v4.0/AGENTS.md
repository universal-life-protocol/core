# AGENTS.md (ULP v4.0)

This file provides guidance to Claude Code (claude.ai/code) when working with ULP v4.0 code.

## Overview

**ULP v4.0** is a minimal, read-only **projection layer** that is additive to v1.1–v3.0. It does NOT execute worlds or mutate traces. It provides deterministic tools for trace projection, canonicalization, and semantic distance computation.

**Key principle**: "The trace is the machine. v4 provides the view contract."

## Repository Structure

```
ulp-v4.0/
├── bin/                     # Projection tools (Node.js)
│   ├── adapter.mjs          # Adapt v3 trace.log → v4 semantic core
│   ├── canon-core.mjs       # Canonicalize entries for Δ
│   ├── delta.mjs            # Compute Δ between traces
│   └── summary.mjs          # Trace summary tool
├── examples/
│   └── v3-adapt/            # Example v3→v4 adaptation outputs
├── README.md                # Quick start guide
└── AGENTS.md                # This file
```

## Core Concepts

### Projection-Only Architecture

v4 is **not an execution engine**. It reads existing traces and provides:

1. **Canonical representation** of trace entries for hashing
2. **Semantic distance (Δ)** computation between traces
3. **Adapters** that map v1.1/v2.0/v3.0 traces to v4 semantic core
4. **View contracts** for deterministic rendering

### Semantic Core Entry Format

v4 operates on a standardized entry format:

```json
{
  "entry_id": "stable-id",
  "kind": "FACT|QUESTION|COMMITMENT|REQUEST|OFFER|STORY|CONSENT",
  "quadrant": "KNOWN_KNOWN|KNOWN_UNKNOWN|UNKNOWN_KNOWN|UNKNOWN_UNKNOWN",
  "unit": "self|other|system",
  "content": "normalized text",
  "tags": ["array", "of", "tags"],
  "refs": ["array", "of", "references"]
}
```

**All projection operations are deterministic** - same input produces byte-identical output.

### Delta (Δ) - Semantic Distance

Δ is a computable function that measures semantic distance between two traces. It operates on:

- **Set distance**: Jaccard distance on entry hash sets
- **Order distance**: Edit distance on entry sequences
- **Quadrant/unit/kind distances**: Metadata similarity

See `dev-docs/v4/ULP-v4-DELTA.md` for full specification.

### .symmetry File

Declares meaning-preserving transformations under Δ. Specifies:

- Δ profile (weight/threshold bundle)
- Allowed/forbidden transforms (reorder, mirror, project, etc.)
- Invariants (entry_hash_set, schema_shape, etc.)

See `dev-docs/v4/ULP-v4-SYMMETRY.md` for grammar and semantics.

## Essential Commands

### Adapt v3 Trace to v4

```bash
cd ulp-v4.0

# Basic adaptation
node bin/adapter.mjs --trace ../ulp-v3.0/out/trace.log --out /tmp/v4

# With kind mapping from .view file
node bin/adapter.mjs \
  --trace ../ulp-v3.0/out/trace.log \
  --out /tmp/v4 \
  --view /path/to/.view
```

**Outputs**:
- `/tmp/v4/entries.jsonl` - Semantic core entries
- `/tmp/v4/entries.core.jsonl` - Canonicalized + hashed
- `/tmp/v4/view.stub` - Derived view configuration
- `/tmp/v4/symmetry.stub` - Default symmetry profile

### Canonicalize Entries

```bash
# Canonicalize a JSONL trace
node bin/canon-core.mjs /path/to/entries.jsonl > /tmp/core.jsonl
```

Canonicalization ensures:
- Byte-stable JSON serialization
- Deterministic field ordering
- Normalized whitespace in content
- Sorted arrays (tags, refs)

### Compute Δ Between Traces

```bash
# Compare two canonicalized traces
node bin/delta.mjs \
  --a /tmp/v4a/entries.core.jsonl \
  --b /tmp/v4b/entries.core.jsonl
```

Returns:
- Component distances (set, order, quad, unit, kind)
- Total weighted Δ
- Symmetry verdict (if threshold specified)

### Generate Trace Summary

```bash
node bin/summary.mjs /tmp/v4/entries.jsonl
```

Shows:
- Entry count
- Kind/quadrant/unit distributions
- Tag/ref statistics

## Key Implementation Files

### Projection Tools

**bin/adapter.mjs**:
- Reads v3 `trace.log` (tab-separated format)
- Maps v3 event types → v4 semantic kinds
- Applies optional `.view` kind mappings
- Emits canonical v4 entries + stubs

**bin/canon-core.mjs**:
- Implements canonical JSON serialization
- Normalizes content (whitespace collapse)
- Sorts tags/refs deterministically
- Computes SHA-256 entry hashes

**bin/delta.mjs**:
- Loads two canonicalized traces
- Computes component distances
- Applies symmetry weights
- Reports Δ metric

**bin/summary.mjs**:
- Analyzes trace statistics
- Reports distributions
- Useful for debugging adaptations

## Development Workflow

### Modifying Code

1. **Preserve determinism**: Same inputs MUST produce byte-identical outputs
2. **No execution**: v4 tools are read-only projections
3. **No trace mutation**: Never modify source traces
4. **Canonical compliance**: Follow `ULP-v4-DELTA.md` canonicalization rules
5. **Pure functions**: All tools must be side-effect-free

### Testing Determinism

```bash
# Generate projections twice
node bin/adapter.mjs --trace input.log --out /tmp/v4a
node bin/adapter.mjs --trace input.log --out /tmp/v4b

# Must be byte-for-byte identical
cmp /tmp/v4a/entries.core.jsonl /tmp/v4b/entries.core.jsonl
```

### Adding New Adapters

1. Follow `dev-docs/v4/ULP-v4-ADAPTER-SPEC.md`
2. Parse source trace format deterministically
3. Map to semantic core fields
4. Normalize content per Δ rules
5. Emit canonical JSONL
6. Generate `.view` and `.symmetry` stubs

### Debugging Projections

```bash
# View raw adapted entries
cat /tmp/v4/entries.jsonl | jq .

# Check canonicalized hashes
head -5 /tmp/v4/entries.core.jsonl | jq .

# Compare specific fields
jq -r '.kind' /tmp/v4/entries.jsonl | sort | uniq -c
jq -r '.quadrant' /tmp/v4/entries.jsonl | sort | uniq -c

# Validate canonical order
node bin/canon-core.mjs test.jsonl | jq -c . | diff - test.jsonl
```

## Important Constraints

### Determinism Requirements

- **No timestamps**: Projections must not depend on wall-clock time
- **No randomness**: All operations are deterministic
- **Byte-stable JSON**: Follow canonical serialization rules exactly
- **Hash stability**: SHA-256 over canonical form only
- **Content normalization**: Whitespace collapse is mandatory

### Architectural Invariants

**Projection-only**:
- v4 tools NEVER execute worlds
- v4 tools NEVER mutate traces
- v4 tools are pure functions of input traces

**Compatibility**:
- v4 is additive to v1.1/v2.0/v3.0
- Adapters preserve original traces unchanged
- v3 execution remains authoritative

**Canonical Form**:
- Field order: `entry_id, kind, quadrant, unit, content, tags, refs`
- Empty arrays omitted (unless strict mode)
- UTF-8, no BOM, minimal JSON

## Kind Mapping (v3 → v4)

The adapter uses default mappings unless overridden by `.view`:

```
# Default v3 event → v4 kind mappings
STDIN      → REQUEST
STDOUT     → FACT
STDERR     → FACT
CLAUSE     → STORY
EXEC       → STORY
ALG_*      → META
POLICY     → META
GEOMETRY   → META
REPLICA    → META
```

### Custom Kind Mapping via .view

Create a `.view` file with:

```
map kind
  STDIN REQUEST
  STDOUT FACT
  CLAUSE COMMITMENT
  ALG_PROC META
  ALG_BIND META
end map
```

Then adapt with:

```bash
node bin/adapter.mjs \
  --trace ../ulp-v3.0/out/trace.log \
  --out /tmp/v4 \
  --view /path/to/.view
```

**Common overrides**:
- `CLAUSE` → `COMMITMENT` or `STORY` (narrative intent)
- `ALG_*` → `FACT` or `META` (algebra visibility)
- `POLICY`/`GEOMETRY`/`REPLICA` → `META` (metadata hiding)

## Documentation References

### v4-Specific Docs

Located in `dev-docs/v4/`:

- **ULP-v4-DELTA.md** - Δ definition and computation
- **ULP-v4-SYMMETRY.md** - `.symmetry` grammar and semantics
- **ULP-v4-RENDERER-CONTRACT.md** - Renderer compliance spec
- **ULP-v4-ADAPTER-SPEC.md** - Adapter implementation guide
- **ULP-v4-VIEW-STUB.md** - Minimal `.view` grammar
- **ULP-v4-RENDERER-TESTS.md** - Renderer compliance tests
- **ULP-v4-UPGRADE-PROPOSAL.md** - v1.1→v3.0→v4 upgrade path

### Cross-Version Docs

See repository root:

- **AGENTS.md** - Multi-version repository guidance
- **REPOSITORY-STRUCTURE.md** - Full repository map
- **production-docs/VERSION-EVOLUTION.md** - Version relationships

## Common Patterns

### Creating a Minimal v4 Projection

```bash
# 1. Generate a v3 trace
cd ../ulp-v3.0
printf 'hello\nworld\n' | ./bin/run.sh world out

# 2. Adapt to v4
cd ../ulp-v4.0
node bin/adapter.mjs --trace ../ulp-v3.0/out/trace.log --out /tmp/v4

# 3. Inspect results
cat /tmp/v4/entries.jsonl | jq .
cat /tmp/v4/view.stub
cat /tmp/v4/symmetry.stub
```

### Computing Δ for Two Projections

```bash
# Generate two different v3 traces
cd ../ulp-v3.0
printf 'hello\n' | ./bin/run.sh world out1
printf 'world\n' | ./bin/run.sh world out2

# Adapt both
cd ../ulp-v4.0
node bin/adapter.mjs --trace ../ulp-v3.0/out1/trace.log --out /tmp/v4a
node bin/adapter.mjs --trace ../ulp-v3.0/out2/trace.log --out /tmp/v4b

# Compute Δ
node bin/delta.mjs --a /tmp/v4a/entries.core.jsonl --b /tmp/v4b/entries.core.jsonl
```

### Verifying Canonical Stability

```bash
# Canonicalize twice
node bin/canon-core.mjs input.jsonl > /tmp/c1.jsonl
node bin/canon-core.mjs /tmp/c1.jsonl > /tmp/c2.jsonl

# Must be identical (idempotent)
diff /tmp/c1.jsonl /tmp/c2.jsonl
```

## Node.js Environment

All v4 tools are written in modern JavaScript (ES modules):

- **Runtime**: Node.js v16+ recommended
- **Module system**: ES modules (`.mjs`)
- **Dependencies**: None (pure Node.js stdlib)
- **Platform**: POSIX-compatible (Linux, macOS, Termux)

### Running Tools

```bash
# No npm install required - pure stdlib
node bin/adapter.mjs --help
node bin/canon-core.mjs --help
node bin/delta.mjs --help
```

## Relationship to Other Versions

### v1.1 (Sealed)

- v4 can read v1.1 traces via adapter
- v1.1 execution remains sealed and unchanged
- v4 provides modern projection layer for v1.1 traces

### v2.0

- v4 can adapt v2.0 `POLICY/GEOMETRY/REPLICA` metadata
- v2.0 network layer is orthogonal to v4 projections
- v4 treats v2.0 metadata as `META` kind by default

### v3.0

- **Primary integration target**
- v4 adapter reads v3 `trace.log` format directly
- v3 dotfile `.view` can customize kind mappings
- v3 execution algebra remains authoritative

### Cross-Version Strategy

v4 is **additive only**:
- Does not replace any execution engine
- Does not modify original traces
- Provides unified projection layer for all versions

## Git Workflow Notes

- v4 is new development (not yet in main branch commits)
- Located in `ulp-v4.0/` directory
- Example outputs in `examples/v3-adapt/`
- Specification docs in `dev-docs/v4/`

## When Working with v4

### DO

- Use v4 for trace analysis and projection
- Generate v4 views from v3 traces
- Compute Δ for trace comparison
- Create custom `.view` kind mappings
- Test determinism of all adaptations

### DON'T

- Don't use v4 to execute worlds (use v3 core)
- Don't modify source traces with v4 tools
- Don't add non-deterministic operations
- Don't bypass canonical serialization
- Don't assume v4 replaces execution engines

## Example Workflow

```bash
# Full v3 → v4 projection workflow

# 1. Create and execute v3 world
cd ../ulp-v3.0
printf 'test input\n' | ./bin/run.sh examples/minimal out

# 2. Adapt to v4
cd ../ulp-v4.0
node bin/adapter.mjs \
  --trace ../ulp-v3.0/out/trace.log \
  --out /tmp/v4-projection

# 3. Inspect semantic core
cat /tmp/v4-projection/entries.jsonl | jq '.kind' | sort | uniq -c

# 4. Check canonicalization
head -3 /tmp/v4-projection/entries.core.jsonl | jq .

# 5. Generate summary
node bin/summary.mjs /tmp/v4-projection/entries.jsonl

# 6. Use in renderer (future)
# Renderers consume entries.core.jsonl + view.stub + symmetry.stub
```

## Important Notes

1. **v4 is read-only** - Never modifies source traces
2. **Deterministic by design** - All operations are pure functions
3. **Additive layer** - Does not replace v1.1/v2.0/v3.0
4. **Projection focus** - Not an execution engine
5. **Renderer contract** - Designed for deterministic view rendering

## Quick Reference

| Task | Command |
|------|---------|
| Adapt v3 trace | `node bin/adapter.mjs --trace <log> --out <dir>` |
| Canonicalize | `node bin/canon-core.mjs <jsonl>` |
| Compute Δ | `node bin/delta.mjs --a <jsonl> --b <jsonl>` |
| Summarize | `node bin/summary.mjs <jsonl>` |
| Custom mapping | `node bin/adapter.mjs ... --view <.view>` |

## Further Reading

1. Start with `README.md` for quick overview
2. Read `dev-docs/v4/ULP-v4-DELTA.md` for Δ definition
3. Read `dev-docs/v4/ULP-v4-ADAPTER-SPEC.md` for adapter details
4. Read `dev-docs/v4/ULP-v4-SYMMETRY.md` for `.symmetry` grammar
5. Read `dev-docs/v4/ULP-v4-RENDERER-CONTRACT.md` for renderer spec
6. See repository root `AGENTS.md` for multi-version context
