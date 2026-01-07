# AI Agents Guide for ULP

This guide helps AI agents understand, build, and work with the Universal Life Protocol (ULP) self-encoding trace system.

## Quick Agent Orientation

### What is ULP?

ULP is a **self-encoding trace system** where every execution trace contains the complete program that generated it. Key properties:

- **Self-encoding**: Traces contain full source code
- **Deterministic**: Same inputs → identical outputs
- **Reproducible**: Trace → Program → Same trace
- **Verifiable**: Cryptographic hashes prove integrity

### Why Should Agents Care?

1. **Reproducibility**: Verify that code hasn't changed
2. **Portability**: Single trace file contains everything
3. **Debugging**: Full execution history + source in one artifact
4. **Communication**: Traces are self-documenting
5. **Verification**: Prove what code ran and what it did

---

## Agent Task: Understanding an Existing System

### Step 1: Identify the System

Look for these indicators:
```bash
# Directory structure
ulp/
├── world/          # Configuration dotfiles
├── interrupts/     # Handlers
├── bin/            # Core utilities
└── out/            # Traces

# Key files
world/.genesis      # Identity
world/.procedure    # What executes
world/.interrupt    # Entry points
bin/run.sh          # Main runner
```

### Step 2: Read World Configuration

```bash
# Identity and metadata
cat world/.genesis

# What procedures exist
cat world/.procedure

# What's allowed to run
cat world/.include

# Entry point
grep "on_start" world/.interrupt
```

### Step 3: Understand Procedures

Procedure format:
```
procedure <name>
<opening_signature>
interrupt <HANDLER>
<closing_signature>
```

**Critical**: Opening and closing signatures must be identical **multisets**.

Example:
```
procedure render_lines
(([              # 2×( + 1×[
interrupt PRINT
[((              # 2×( + 1×[ (same multiset, different order)
```

### Step 4: Examine Traces

```bash
# View trace structure
head -50 out/trace.log

# Extract execution records
grep "^STDOUT" out/trace.log

# See embedded files
grep "^FILE" out/trace.log

# Get world ID
grep "^WORLD" out/trace.log
```

---

## Agent Task: Building a New ULP System

### Quick Build (Recommended)

```bash
# Use the provided build script
chmod +x build.sh
./build.sh

# Verify
cd ulp
./validate.sh
```

### Custom Build

1. **Create directory structure**
```bash
mkdir -p ulp/{world,interrupts,bin,out}
cd ulp
```

2. **Define world files** (see PHASE 1 in RUN_SCRIPT.md)

3. **Create interrupt handlers** (see PHASE 2)

4. **Add core utilities** (see PHASE 3-7)

5. **Test**
```bash
echo 'test' | ./bin/run.sh world out
```

### Common Pitfalls for Agents

❌ **Don't**: Use `])(` and `(([` - different multisets
✅ **Do**: Use `[((` and `(([` - same multiset

❌ **Don't**: Forget to `chmod +x` scripts
✅ **Do**: Make all `.sh` files executable

❌ **Don't**: Put `next` in AWK END blocks
✅ **Do**: Use `continue` in FOR loops inside END

❌ **Don't**: Use `/tmp` for temp files (Termux issues)
✅ **Do**: Use in-memory operations or `$OUTDIR/.tmp.$$`

---

## Agent Task: Modifying Procedures

### Adding a New Interrupt Handler

1. **Create the handler**
```bash
cat > interrupts/UPPERCASE.sh << 'EOF'
#!/bin/sh
tr '[:lower:]' '[:upper:]'
EOF
chmod +x interrupts/UPPERCASE.sh
```

2. **Add to whitelist**
```bash
echo "UPPERCASE" >> world/.include
```

3. **Update procedure**
```bash
cat > world/.procedure << 'EOF'
procedure transform_text
{{{
interrupt UPPERCASE
}}}
EOF
```

4. **Test**
```bash
echo 'hello world' | ./bin/run.sh world out
grep "^STDOUT" out/trace.log
```

### Chaining Multiple Interrupts

```bash
procedure multi_step
<<<
interrupt STEP_ONE
>>>
{{{
interrupt STEP_TWO
}}}
[[[
interrupt STEP_THREE
]]]
```

**Rule**: Each interrupt's opening and closing must be identical multisets.

---

## Agent Task: Analyzing Traces

### Extract Execution Flow

```bash
# See all interrupts that ran
awk -F '\t' '$1=="EXEC" {print $8}' trace.log

# Get input data
awk -F '\t' '$1=="STDIN" {print $5}' trace.log

# Get output data
awk -F '\t' '$1=="STDOUT" {print $5}' trace.log

# Check exit codes
awk -F '\t' '$1=="EXIT" {print $2, $4}' trace.log
```

### Verify Trace Integrity

```bash
# Get world ID from trace
WID=$(awk -F '\t' '$1=="WORLD" {print $3; exit}' trace.log)

# Get manifest hash
MANIFEST=$(awk -F '\t' '$1=="MANIFEST" {print $3; exit}' trace.log)

# Count embedded files
FILE_COUNT=$(grep -c "^FILE" trace.log)

echo "World ID: $WID"
echo "Manifest: $MANIFEST"
echo "Files: $FILE_COUNT"
```

### Reconstruct Source from Trace

```bash
# Full reconstruction
./bin/decode_trace.sh trace.log output/

# Extract single file
awk -F '\t' '
$1=="FILE" && $3=="WORLD/.procedure" {flag=1; next}
$1=="DATA" && flag {print $2}
$1=="END_FILE" && flag {exit}
' trace.log | base64 -d
```

---

## Agent Task: Debugging Issues

### Multiset Mismatch Error

**Error:**
```
error: scope multiset mismatch in render_lines: OPEN=[{{{] CLOSE=[}}}] INT=[PRINT]
```

**Diagnosis**: Opening and closing have different characters.

**Fix**: Ensure same multiset
```bash
# Check opening
grep -A1 "procedure render_lines" world/.procedure | tail -1

# Check closing
grep -A3 "procedure render_lines" world/.procedure | tail -1

# Both should have same characters (any order)
```

### Validation Failure

**Error:**
```
✗ Determinism: byte-for-byte identical traces
```

**Common Causes:**
1. Non-deterministic data in world files (timestamps, random values)
2. Different tool versions (awk, base64)
3. File permissions not preserved
4. Incomplete reconstruction

**Debug:**
```bash
# Compare hashes
sha256sum out/trace.log
sha256sum reconstructed/REPO/out2/trace.log

# Find differences
diff <(head -50 out/trace.log) <(head -50 reconstructed/REPO/out2/trace.log)
```

### Permission Issues

**Error:**
```
missing interrupt handler: interrupts/PRINT.sh
```

**Fix:**
```bash
# Make all handlers executable
chmod +x interrupts/*.sh

# Verify
ls -la interrupts/
```

---

## Agent Communication Patterns

### Pattern 1: Trace as Message

Agents can communicate by exchanging traces:

```bash
# Agent A creates trace
echo "data from agent A" | ./bin/run.sh world out
TRACE_A="out/trace.log"

# Agent B receives trace and verifies
./bin/decode_trace.sh $TRACE_A verified/
cd verified/REPO
echo "data from agent B" | ./bin/run.sh ../WORLD out

# Agent B sends response trace back to Agent A
```

### Pattern 2: Trace as Proof

Agents can prove what code they ran:

```bash
# Agent claims to have run specific code
# Send trace.log

# Verifier checks:
# 1. World ID matches expected configuration
EXPECTED_WID="abc123..."
ACTUAL_WID=$(awk -F '\t' '$1=="WORLD" {print $3}' trace.log)
[ "$EXPECTED_WID" = "$ACTUAL_WID" ] && echo "✓ Correct world"

# 2. Manifest hash matches expected code
EXPECTED_MANIFEST="def456..."
ACTUAL_MANIFEST=$(awk -F '\t' '$1=="MANIFEST" {print $3}' trace.log)
[ "$EXPECTED_MANIFEST" = "$ACTUAL_MANIFEST" ] && echo "✓ Correct code"

# 3. Results match expectations
EXPECTED_OUTPUT="expected output"
ACTUAL_OUTPUT=$(awk -F '\t' '$1=="STDOUT" {print $5}' trace.log | head -1)
[ "$EXPECTED_OUTPUT" = "$ACTUAL_OUTPUT" ] && echo "✓ Correct output"
```

### Pattern 3: Trace as Snapshot

Agents can create execution snapshots:

```bash
# Create snapshot at specific point
echo "input" | ./bin/run.sh world snapshot_$(date +%s)

# Later, compare snapshots
diff snapshot_1234567890/trace.log snapshot_1234567891/trace.log
```

---

## Agent Best Practices

### 1. Always Validate

```bash
# After building
./validate.sh

# After modifying
echo "test" | ./bin/run.sh world out
./bin/decode_trace.sh out/trace.log verify/
cd verify/REPO && echo "test" | ./bin/run.sh ../WORLD out2
cmp ../../out/trace.log out2/trace.log
```

### 2. Check Multisets Before Writing

```python
def is_valid_multiset_pair(open_sig, close_sig):
    """Verify signatures are identical multisets"""
    from collections import Counter
    return Counter(open_sig) == Counter(close_sig)

# Example
assert is_valid_multiset_pair("(([", "[((")  # ✓ Valid
assert not is_valid_multiset_pair("(([", "])(")  # ✗ Invalid
```

### 3. Use Deterministic Data Only

**Good** (deterministic):
```bash
cat > world/.genesis << 'EOF'
user agent
runtime posix
version 1
EOF
```

**Bad** (non-deterministic):
```bash
cat > world/.genesis << EOF
user agent
runtime posix
timestamp $(date)
random $(uuidgen)
EOF
```

### 4. Preserve File Modes

When creating scripts:
```bash
# Create
cat > script.sh << 'EOF'
#!/bin/sh
echo "hello"
EOF

# ALWAYS chmod
chmod +x script.sh
```

### 5. Handle Errors Gracefully

```bash
# Check prerequisites
command -v awk >/dev/null || { echo "need awk"; exit 127; }
command -v base64 >/dev/null || { echo "need base64"; exit 127; }

# Validate inputs
[ -f world/.procedure ] || { echo "missing .procedure"; exit 2; }

# Clean up on exit
cleanup() {
    rm -rf "$TMPDIR"
}
trap cleanup EXIT
```

---

## Agent Workflows

### Workflow 1: Build and Verify

```bash
# 1. Build system
./build.sh

# 2. Run with test input
cd ulp
echo "test input" | ./bin/run.sh world out

# 3. Verify self-encoding
grep -q "^MANIFEST" out/trace.log && echo "✓ Self-encoded"

# 4. Test reconstruction
./bin/decode_trace.sh out/trace.log test_recon/

# 5. Verify determinism
cd test_recon/REPO
echo "test input" | ./bin/run.sh ../WORLD out2
cmp ../../out/trace.log out2/trace.log && echo "✓ Deterministic"
```

### Workflow 2: Modify and Test

```bash
# 1. Read current procedure
cat world/.procedure

# 2. Backup
cp world/.procedure world/.procedure.backup

# 3. Modify (ensure multisets match!)
cat > world/.procedure << 'EOF'
procedure new_proc
<<<
interrupt NEW_HANDLER
>>>
EOF

# 4. Test
echo "test" | ./bin/run.sh world out || {
    echo "Failed! Restoring backup..."
    mv world/.procedure.backup world/.procedure
}

# 5. Validate
./validate.sh
```

### Workflow 3: Trace Analysis

```bash
# 1. Get trace
TRACE="out/trace.log"

# 2. Extract metadata
echo "=== Metadata ==="
awk -F '\t' '$1=="HDR" {print $2 ": " $3}' $TRACE
awk -F '\t' '$1=="WORLD" {print "World ID: " $3}' $TRACE

# 3. Execution summary
echo "=== Execution ==="
awk -F '\t' '$1=="EXEC" {print "Ran: " $8}' $TRACE

# 4. I/O summary
echo "=== Input ==="
awk -F '\t' '$1=="STDIN" {print $5}' $TRACE
echo "=== Output ==="
awk -F '\t' '$1=="STDOUT" {print $5}' $TRACE

# 5. Exit status
echo "=== Exit ==="
awk -F '\t' '$1=="EXIT" {print $2 " exited with code " $4}' $TRACE
```

---

## Advanced Agent Topics

### Custom World Configurations

Agents can create specialized worlds:

```bash
# Data processing world
cat > world/.genesis << 'EOF'
user data_agent
runtime posix
purpose data_transformation
EOF

cat > world/.procedure << 'EOF'
procedure etl_pipeline
{{{
interrupt EXTRACT
}}}
<<<
interrupt TRANSFORM
>>>
[[[
interrupt LOAD
]]]
EOF
```

### Programmatic Trace Generation

Agents can script trace creation:

```bash
#!/bin/bash
# Agent script: create_traces.sh

INPUTS=(
    "data1"
    "data2"
    "data3"
)

for i in "${!INPUTS[@]}"; do
    echo "${INPUTS[$i]}" | ./bin/run.sh world "out_$i"
    echo "Created trace $i: $(sha256sum "out_$i/trace.log" | awk '{print $1}')"
done
```

### Trace Diff Analysis

```bash
# Compare two execution traces
diff_traces() {
    local trace1="$1"
    local trace2="$2"

    echo "=== World Comparison ==="
    diff <(grep "^WORLD" "$trace1") <(grep "^WORLD" "$trace2")

    echo "=== Execution Comparison ==="
    diff <(grep "^EXEC" "$trace1") <(grep "^EXEC" "$trace2")

    echo "=== Output Comparison ==="
    diff <(grep "^STDOUT" "$trace1") <(grep "^STDOUT" "$trace2")
}

diff_traces out/trace.log reconstructed/REPO/out2/trace.log
```

### Automated Validation

```bash
#!/bin/bash
# Agent script: auto_validate.sh

validate_system() {
    local dir="$1"
    cd "$dir" || return 1

    # Check structure
    [ -d world ] || { echo "Missing world/"; return 1; }
    [ -d bin ] || { echo "Missing bin/"; return 1; }
    [ -d interrupts ] || { echo "Missing interrupts/"; return 1; }

    # Check executables
    [ -x bin/run.sh ] || { echo "bin/run.sh not executable"; return 1; }

    # Test execution
    echo "test" | ./bin/run.sh world out >/dev/null 2>&1 || {
        echo "Execution failed"
        return 1
    }

    # Check self-encoding
    grep -q "^MANIFEST" out/trace.log || {
        echo "Not self-encoded"
        return 1
    }

    echo "✓ System valid"
    return 0
}

validate_system "ulp"
```

---

## Agent Troubleshooting Guide

### Problem: Can't understand trace format

**Solution**: Trace format is tab-separated with structure:
```
<TYPE>\t<key1>\t<value1>\t<key2>\t<value2>...
```

Examples:
```
HDR     version    1
STDIN   n    1    text    hello
STDOUT  n    1    text    HELLO
EXIT    intr PRINT code   0
```

Use: `awk -F '\t'` to parse

### Problem: Multiset validation confusing

**Solution**: Think of it as a bag of characters:
- `(([` = bag containing: `(`, `(`, `[`
- `[((` = bag containing: `[`, `(`, `(`
- Same contents = valid multiset pair

Implementation:
```bash
# Sort characters to compare
echo "((["  | fold -w1 | sort | tr -d '\n'  # Output: (([
echo "[(("  | fold -w1 | sort | tr -d '\n'  # Output: (([
# Same sorted form = same multiset
```

### Problem: Build script fails on Termux

**Solution**: The provided build script includes Termux fixes:
- In-memory sorting (no /tmp)
- Platform-independent file modes
- Portable commands

If still failing:
```bash
# Check utilities
command -v awk || pkg install gawk
command -v base64 || pkg install coreutils
command -v sha256sum || pkg install coreutils
```

### Problem: Traces differ on re-run

**Checklist**:
1. ✓ Same input data?
2. ✓ Same world files?
3. ✓ No timestamps in dotfiles?
4. ✓ No random data generation?
5. ✓ File modes preserved?
6. ✓ Same tool versions?

**Debug**:
```bash
# Find first difference
diff -u <(head -100 trace1.log) <(head -100 trace2.log) | head -20
```

---

## Quick Reference for Agents

### Essential Commands

| Task | Command |
|------|---------|
| Build | `./build.sh` |
| Run | `echo 'data' \| ./bin/run.sh world out` |
| Validate | `./validate.sh` |
| Reconstruct | `./bin/decode_trace.sh trace.log output/` |
| Verify determinism | `cmp trace1.log trace2.log` |
| Extract stdout | `awk -F '\t' '$1=="STDOUT" {print $5}' trace.log` |
| Get world ID | `awk -F '\t' '$1=="WORLD" {print $3}' trace.log` |
| Count files | `grep -c "^FILE" trace.log` |

### File Structure Cheatsheet

```
ulp/
├── world/              # What to run
│   ├── .procedure      # Execution flow
│   ├── .interrupt      # Entry points
│   └── .include        # Allowed handlers
├── interrupts/         # What executes
│   └── *.sh           # Handler scripts
├── bin/               # How it runs
│   ├── run.sh         # Main runner
│   └── decode_trace.sh # Trace decoder
└── out/               # Results
    └── trace.log      # Self-encoded trace
```

### Multiset Examples

| Opening | Closing | Valid? | Reason |
|---------|---------|--------|--------|
| `(([` | `[((` | ✓ | 2×( + 1×[ = 2×( + 1×[ |
| `{{{` | `}}}` | ✗ | 3×{ ≠ 3×} |
| `<<<` | `<<<` | ✓ | 3×< = 3×< |
| `[{(` | `({[` | ✓ | 1×[ + 1×{ + 1×( = 1×( + 1×{ + 1×[ |
| `(([` | `])(` | ✗ | 2×( + 1×[ ≠ 1×] + 1×) + 1×( |

### Trace Record Types

| Type | Purpose | Fields |
|------|---------|--------|
| `HDR` | Header metadata | version, entry |
| `WORLD` | World ID | wid |
| `STDIN` | Input lines | n, text |
| `CLAUSE` | Procedure clause | qid, openSig, closeSig, intr |
| `EXEC` | Execution record | eid, wid, qid, intr |
| `STDOUT` | Output lines | n, text |
| `STDERR` | Error lines | n, text |
| `EXIT` | Exit status | intr, code |
| `MANIFEST` | Self-encoding header | sha256, count |
| `FILE` | File metadata | path, sha256, mode, bytes |
| `DATA` | File content (base64) | (single field) |
| `END_FILE` | File terminator | path |

---

## Agent Learning Resources

### Recommended Reading Order

1. **GETTING_STARTED.md** - Understand what ULP is
2. **This file (AGENTS.md)** - Learn agent-specific patterns
3. **RUN_SCRIPT.md** - Deep technical reference
4. **README.md** (in ulp/) - System overview

### Hands-On Learning

```bash
# 1. Build a system
./build.sh

# 2. Run it
cd ulp
echo "learning" | ./bin/run.sh world out

# 3. Examine the trace
less out/trace.log

# 4. Reconstruct it
./bin/decode_trace.sh out/trace.log learn/

# 5. Compare files
diff -r world/ learn/WORLD/
diff -r bin/ learn/REPO/bin/

# 6. Re-run
cd learn/REPO
echo "learning" | ./bin/run.sh ../WORLD out2

# 7. Verify
cmp ../../out/trace.log out2/trace.log
```

### Key Concepts to Master

1. **Multiset equality** - Character counts, not order
2. **Determinism** - No randomness, no timestamps
3. **Self-encoding** - Trace contains source
4. **Cryptographic identity** - WID, QID, EID hashes
5. **Reproducibility** - Trace → Program → Same trace

---

## Agent Success Criteria

You've mastered ULP when you can:

- ✓ Build a ULP system from scratch
- ✓ Modify procedures without breaking multiset validation
- ✓ Create interrupt handlers that work correctly
- ✓ Analyze traces to understand execution flow
- ✓ Verify trace integrity and authenticity
- ✓ Debug multiset mismatches
- ✓ Ensure deterministic execution
- ✓ Reconstruct systems from traces
- ✓ Write scripts that automate ULP workflows
- ✓ Explain why multisets matter

---

## Contributing as an Agent

If you're an agent helping improve ULP:

### Report Issues Clearly

```markdown
**Issue**: Multiset validation fails for valid pair
**Opening**: (([
**Closing**: [((
**Error**: scope multiset mismatch
**Expected**: Should validate (same multiset)
**System**: Linux, awk version X.Y.Z
```

### Suggest Improvements

```markdown
**Enhancement**: Support compressed traces
**Rationale**: Reduce file size for large programs
**Implementation**: Add gzip step after base64
**Compatibility**: Backward compatible with decoder flag
```

### Document Patterns

```markdown
**Pattern**: Multi-stage data pipeline
**Use Case**: ETL workflows
**Example**:
procedure etl
{{{ interrupt EXTRACT }}}
<<< interrupt TRANSFORM >>>
[[[ interrupt LOAD ]]]
```

---

## Conclusion for Agents

ULP is a powerful system for creating reproducible, verifiable executions. As an AI agent:

1. **Understand** the core principles (self-encoding, determinism, multisets)
2. **Build** systems using provided tools and patterns
3. **Verify** everything with validation and testing
4. **Debug** using systematic approaches
5. **Communicate** using traces as proof

The key insight: **Traces are not just logs, they're executable programs.**

---

**For Agents**: If you encounter issues or have questions, refer to:
- RUN_SCRIPT.md for technical details
- GETTING_STARTED.md for user-level examples
- validate.sh for working code examples

**Built for AI agents on:** 2025-12-30
**System version:** 1.0
**Trace format:** Tab-separated key-value pairs
