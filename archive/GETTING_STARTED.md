# Getting Started with ULP

Welcome! This guide will help you build and run the Universal Life Protocol (ULP) self-encoding trace system in just a few minutes.

## What is ULP?

ULP is a **self-encoding trace system** that creates execution logs containing the complete program that generated them. Every trace can reconstruct and re-run itself, producing identical results.

Think of it as a program that writes its own DNA into every output file.

## What You'll Build

A system that:
- ✓ Executes procedures defined in simple config files
- ✓ Captures complete execution traces
- ✓ Embeds the entire program into each trace
- ✓ Reconstructs itself from any trace
- ✓ Produces byte-for-byte identical results on re-runs

## Prerequisites

You need a POSIX-compliant system with:
- `sh` (standard shell)
- `awk` (text processing)
- `base64` (encoding)
- `sha256sum` or `shasum` or `openssl` (hashing)

**Most Linux, macOS, and Termux environments have these built-in.**

---

## Quick Start (5 Minutes)

### Step 1: Get the Build Script

Download or create `build.sh` in your working directory:

```bash
cd universal-life-protocol
chmod +x build.sh
```

### Step 2: Build the System

```bash
./build.sh
```

You should see:
```
=== Building ULP System ===
1. Creating world dotfiles...
2. Creating interrupt handler...
3. Creating core utilities...
4. Creating main runner and utilities...
5. Building complete!
```

### Step 3: Run Your First Trace

```bash
cd ulp
echo -e 'hello\nworld' | ./bin/run.sh world out
```

Output:
```
wrote out/trace.log
```

### Step 4: Verify It Works

```bash
./validate.sh
```

You should see all checks pass with ✓ marks.

**Congratulations!** You've built and run the ULP system.

---

## Understanding What Just Happened

### 1. You created a "world"
The `world/` directory contains configuration files (dotfiles) that define:
- What procedures exist
- How they execute
- What data flows through the system

### 2. You ran a procedure
The system:
- Read your input (`hello\nworld`)
- Executed the `render_lines` procedure
- Captured everything in a trace

### 3. You got a self-encoded trace
The file `out/trace.log` contains:
- **Execution records**: What happened when you ran it
- **Complete source code**: All files needed to rebuild the system
- **Cryptographic hashes**: Proof of determinism

---

## Try It Yourself

### Example 1: Different Input

```bash
cd ulp
echo -e 'foo\nbar\nbaz' | ./bin/run.sh world out
cat out/trace.log | grep "^STDOUT"
```

### Example 2: Reconstruct from Trace

```bash
# Decode the trace
mkdir -p test_reconstruct
./bin/decode_trace.sh out/trace.log test_reconstruct

# Verify files were recreated
ls -la test_reconstruct/WORLD/
ls -la test_reconstruct/REPO/bin/
```

### Example 3: Re-run from Reconstructed Files

```bash
# Run the reconstructed system
cd test_reconstruct/REPO
echo -e 'hello\nworld' | ./bin/run.sh ../WORLD out2

# Compare traces (should be identical!)
cd ../..
cmp ulp/out/trace.log test_reconstruct/REPO/out2/trace.log && echo "IDENTICAL!"
```

### Example 4: View Trace Contents

```bash
cd ulp

# See execution records
head -20 out/trace.log

# See embedded files
grep "^FILE" out/trace.log

# Count embedded data blocks
grep -c "^DATA" out/trace.log
```

---

## Directory Structure

After building, you'll have:

```
universal-life-protocol/
├── build.sh              # Build script (run this first)
├── RUN_SCRIPT.md        # Complete technical reference
├── GETTING_STARTED.md   # This file
└── ulp/                 # Built system
    ├── world/           # Configuration (12 dotfiles)
    │   ├── .genesis
    │   ├── .procedure
    │   ├── .interrupt
    │   └── ...
    ├── interrupts/      # Handlers
    │   └── PRINT.sh
    ├── bin/             # Core utilities
    │   ├── run.sh       # Main runner
    │   ├── hash.sh      # Hashing
    │   ├── decode_trace.sh
    │   └── ...
    ├── out/             # Output
    │   └── trace.log    # Self-encoded trace
    ├── validate.sh      # Test suite
    └── README.md        # Documentation
```

---

## Key Concepts

### World Files
Configuration files in `world/` define your system:
- `.genesis` - Who/what/when
- `.procedure` - What to execute
- `.interrupt` - Handlers to call
- `.include` - Allowed operations

### Traces
Every execution creates a trace containing:
1. **Header**: Version, entry point, world ID
2. **Execution**: Input, output, exit codes
3. **Self-encoding**: Complete source code as base64

### Determinism
Same inputs **always** produce identical traces:
- Same input data → Same trace SHA256
- Same trace → Same reconstructed program
- Same program → Same trace again

### Self-Encoding
Each trace includes everything needed to rebuild:
- All world dotfiles
- All bin scripts
- All interrupt handlers
- File permissions preserved

---

## Common Tasks

### Change What Gets Executed

Edit `world/.procedure`:
```
procedure render_lines
(([
interrupt PRINT
[((
```

The delimiters define scope boundaries. Opening `(([` and closing `[((` have the same multiset: 2×`(` + 1×`[`.

### Add a New Interrupt Handler

Create `interrupts/MYHANDLER.sh`:
```bash
#!/bin/sh
# Transform input somehow
sed 's/hello/goodbye/g'
```

Make it executable:
```bash
chmod +x interrupts/MYHANDLER.sh
```

Add to `world/.include`:
```
PRINT
render_lines
MYHANDLER
```

Update `world/.procedure`:
```
procedure render_lines
(([
interrupt MYHANDLER
[((
```

### View Trace in Human-Readable Format

```bash
./bin/observe.sh world out/trace.log
```

Or extract just the stdout:
```bash
awk -F '\t' '$1=="STDOUT" {print $5}' out/trace.log
```

---

## Validation & Testing

### Run All Tests

```bash
cd ulp
./validate.sh
```

### Manual Verification

```bash
# 1. Run system
echo 'test' | ./bin/run.sh world out

# 2. Check trace exists
test -f out/trace.log && echo "Trace created"

# 3. Check self-encoding
grep -q "^MANIFEST" out/trace.log && echo "Self-encoded"

# 4. Verify determinism
HASH1=$(sha256sum out/trace.log | awk '{print $1}')
echo 'test' | ./bin/run.sh world out
HASH2=$(sha256sum out/trace.log | awk '{print $1}')
[ "$HASH1" = "$HASH2" ] && echo "Deterministic!"
```

---

## What Makes This Special?

### 1. Self-Encoding
Most programs output data. ULP outputs **data + program**.

### 2. Determinism
Most programs vary output (timestamps, PIDs). ULP is **perfectly reproducible**.

### 3. Reconstructibility
Most logs are just records. ULP logs are **executable programs**.

### 4. Verification
Every trace proves:
- What code ran (WID hash)
- What it did (execution records)
- That it matches (manifest hash)

---

## Troubleshooting

### "missing world/.procedure"
**Solution:** Run from the `ulp/` directory, not the parent directory.

```bash
cd ulp
echo 'test' | ./bin/run.sh world out
```

### "scope multiset mismatch"
**Solution:** Your `.procedure` file has mismatched delimiters. Both opening and closing must have identical characters.

```
procedure render_lines
(([              ← Opening: 2×( + 1×[
interrupt PRINT
[((              ← Closing: 2×( + 1×[ (same multiset, different order)
```

### "cannot redirect to /tmp"
**Solution:** Your build already includes the fix (in-memory sorting). If you're on Termux and seeing this, ensure you're using the latest `bin/proc.awk`.

### Traces differ after reconstruction
**Causes:**
- Non-deterministic data in dotfiles (timestamps, random values)
- File permission issues
- Different versions of tools (awk, base64)

**Solution:** Run `./validate.sh` to identify the issue.

---

## Next Steps

### 1. Read the Full Documentation
See [RUN_SCRIPT.md](RUN_SCRIPT.md) for complete technical details.

### 2. Experiment with Procedures
Try creating multi-step procedures:
```
procedure complex_flow
{{{
interrupt STEP_ONE
}}}
<<<
interrupt STEP_TWO
>>>
```

### 3. Build Custom Handlers
Create interrupt handlers that:
- Transform data
- Generate reports
- Validate inputs
- Compute results

### 4. Explore Traces
```bash
# View full trace structure
less out/trace.log

# Extract embedded world files
awk -F '\t' '$1=="FILE" && $3 ~ /^WORLD/ {print $3}' out/trace.log

# See all execution IDs
awk -F '\t' '$1=="EXEC" {print $3}' out/trace.log
```

---

## Example: Complete Workflow

```bash
# 1. Build
./build.sh

# 2. First run
cd ulp
echo -e 'alpha\nbeta\ngamma' | ./bin/run.sh world out
TRACE1_HASH=$(sha256sum out/trace.log | awk '{print $1}')

# 3. Reconstruct
mkdir -p ../reconstructed
./bin/decode_trace.sh out/trace.log ../reconstructed

# 4. Second run from reconstruction
cd ../reconstructed/REPO
echo -e 'alpha\nbeta\ngamma' | ./bin/run.sh ../WORLD out2
TRACE2_HASH=$(sha256sum out2/trace.log | awk '{print $1}')

# 5. Verify determinism
cd ../..
echo "Trace 1: $TRACE1_HASH"
echo "Trace 2: $TRACE2_HASH"
[ "$TRACE1_HASH" = "$TRACE2_HASH" ] && echo "✓ PERFECT DETERMINISM" || echo "✗ Hashes differ"
```

---

## FAQ

**Q: Why are traces so large?**
A: They contain the complete program source code embedded as base64. This enables self-reconstruction.

**Q: Can I delete the original source after creating a trace?**
A: Yes! The trace contains everything needed to rebuild from scratch.

**Q: What's the point of determinism?**
A: Reproducibility, verification, debugging, and proof that code hasn't changed.

**Q: Can I use this in production?**
A: This is a reference implementation. For production, you'd want:
- Optimized encoding
- Compression
- Streaming support
- Additional validation

**Q: How do I verify a trace is legitimate?**
A:
1. Check the MANIFEST hash matches recomputed manifest
2. Decode and verify each FILE hash matches content
3. Re-run and verify execution produces identical trace

---

## Resources

- **RUN_SCRIPT.md** - Complete technical reference
- **README.md** - System overview (in ulp/ directory)
- **validate.sh** - Test suite with examples
- **world/** - Configuration examples

---

## Quick Reference

### Essential Commands

```bash
# Build system
./build.sh

# Run
cd ulp
echo 'data' | ./bin/run.sh world out

# Validate
./validate.sh

# Reconstruct
./bin/decode_trace.sh out/trace.log output_dir

# Observe
./bin/observe.sh world out/trace.log

# Verify determinism
cmp trace1.log trace2.log
```

### Key Files

| File | Purpose |
|------|---------|
| `world/.procedure` | Define what to execute |
| `world/.interrupt` | Map interrupts to handlers |
| `interrupts/*.sh` | Actual execution handlers |
| `bin/run.sh` | Main execution engine |
| `out/trace.log` | Self-encoded trace output |

---

## Success Criteria

You know it's working when:

1. ✓ `./validate.sh` shows all checks passing
2. ✓ Traces are byte-for-byte identical on re-run
3. ✓ `grep -c "^FILE" out/trace.log` returns 21
4. ✓ Reconstruction succeeds without errors
5. ✓ Re-execution from reconstruction produces same trace

---

## Getting Help

If you're stuck:

1. Run `./validate.sh` to identify the issue
2. Check [Troubleshooting](#troubleshooting) section above
3. Review [RUN_SCRIPT.md](RUN_SCRIPT.md) for detailed explanations
4. Verify you're using the correct working directory

---

## Summary

You've learned how to:
- ✓ Build the ULP system
- ✓ Run procedures and create traces
- ✓ Reconstruct programs from traces
- ✓ Verify determinism
- ✓ Understand the core concepts

**The ULP system demonstrates that programs can be self-encoding, deterministic, and completely reproducible.**

Now go build something interesting! 🚀

---

**Built and validated:** 2025-12-30
**Trace SHA256:** `ebb56a4614c1806ac09e87872316c03b1541f6deb93e89573dccb363594a6e7e`
