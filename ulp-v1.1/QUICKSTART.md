# ULP v1.1 Quick Start Guide

Welcome to the Universal Life Protocol! This guide will get you up and running in 10 minutes.

## Prerequisites

You need:
- POSIX shell (sh, bash, dash)
- awk (any variant: gawk, mawk, nawk, busybox awk)
- One of: sha256sum, shasum, or openssl

Most Linux, macOS, and BSD systems have these by default.

## Installation

```bash
# Navigate to the ulp-v1.1 directory
cd /path/to/ulp-v1.1

# Verify installation
./validate.sh
```

If all tests pass ✓, you're ready!

## Tutorial 1: Your First Trace (2 minutes)

Let's create the simplest possible trace:

```bash
# Send "hello world" to ULP
echo "hello world" | ./bin/run.sh world out

# View the output
./bin/observe.sh world out/trace.log
```

**What just happened?**

1. `echo "hello world"` sent input to ULP
2. `run.sh` constructed a trace in `out/trace.log`
3. `observe.sh` applied the POSIX projection (π_posix) to view it

**Key insight**: The trace is the authoritative record. The stdout you see is a *projection* of the trace, not the trace itself.

## Tutorial 2: Examine the Trace (3 minutes)

Let's look at the raw trace:

```bash
# View the complete trace
cat out/trace.log

# It contains:
# - #METADATA lines (non-semantic)
# - HDR records (headers)
# - WORLD record (identity hash)
# - BEGIN/END sections (structure)
# - STDIN records (your input)
# - STDOUT records (output)
# - FILE/DATA records (self-encoding)
# - SEAL records (hashes)
```

Key sections:

```bash
# Just the headers
grep "^HDR" out/trace.log

# Just the world identity
grep "^WORLD" out/trace.log

# Just the input
grep "^STDIN" out/trace.log

# Just the output
grep "^STDOUT" out/trace.log

# Just the seals
grep "^SEAL" out/trace.log
```

## Tutorial 3: Deterministic Execution (2 minutes)

ULP guarantees: **same inputs → byte-identical traces**

```bash
# Create trace #1
echo "test" | ./bin/run.sh world out1

# Create trace #2
echo "test" | ./bin/run.sh world out2

# Create trace #3
echo "test" | ./bin/run.sh world out3

# Compare - they're byte-identical!
cmp out1/trace.log out2/trace.log && echo "Identical!" ✓
cmp out2/trace.log out3/trace.log && echo "Identical!" ✓

# Verify with hash
./bin/hash.sh < out1/trace.log
./bin/hash.sh < out2/trace.log
# Same hash = same trace
```

This works **every time**, on **any machine**, **forever**.

## Tutorial 4: Self-Encoding (3 minutes)

Every trace contains its complete execution environment.

```bash
# Create a trace
echo "demo" | ./bin/run.sh world out

# Extract the world definition from the trace
./bin/decode_trace.sh out/trace.log reconstructed/

# Look at what was extracted
ls -la reconstructed/WORLD/
ls -la reconstructed/REPO/bin/
ls -la reconstructed/REPO/interrupts/

# Re-execute using the reconstructed world
echo "demo" | ./bin/run.sh reconstructed/WORLD reconstructed/out

# Compare traces - byte-identical!
cmp out/trace.log reconstructed/out/trace.log && echo "Perfect reproduction!" ✓
```

**Why this matters**: You can archive a trace and replay it decades later, byte-for-byte.

## Tutorial 5: Create Your Own Interrupt (5 minutes)

Interrupts are how you add functionality to ULP.

### Step 1: Write the interrupt handler

```bash
# Create a new interrupt
cat > interrupts/GREET.sh << 'EOF'
#!/bin/sh
# GREET interrupt - says hello to the input

# Read from stdin (the trace input)
while IFS= read -r name; do
    echo "Hello, $name! Welcome to ULP."
done
EOF

# Make it executable
chmod +x interrupts/GREET.sh
```

### Step 2: Register the interrupt

```bash
# Add to world definition
echo "interrupt GREET" >> world/.interrupt
```

### Step 3: Update the procedure

```bash
# Edit world/.procedure
cat > world/.procedure << 'EOF'
procedure greet
(([
interrupt GREET
](()
EOF
```

### Step 4: Run it!

```bash
echo "Alice" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
# Output: Hello, Alice! Welcome to ULP.
```

## Tutorial 6: Projections (5 minutes)

Projections are pure functions that transform traces into views.

```bash
# Create a trace with multiple outputs
cat > interrupts/MULTI.sh << 'EOF'
#!/bin/sh
echo "Line 1: First output"
echo "Line 2: Second output"
echo "Line 3: Third output"
EOF

chmod +x interrupts/MULTI.sh
echo "interrupt MULTI" > world/.interrupt
echo -e "procedure multi\n(([\ninterrupt MULTI\n](()" > world/.procedure

# Generate the trace
echo "" | ./bin/run.sh world out
```

### POSIX Projection (default)

```bash
# View as plain text
./bin/observe.sh world out/trace.log
```

### Custom Projections

```bash
# Extract just the STDOUT lines
awk -F'\t' '$1=="STDOUT" {print $5}' out/trace.log

# Count STDOUT records
awk -F'\t' '$1=="STDOUT" {count++} END {print count}' out/trace.log

# Extract to JSON
awk -F'\t' '
BEGIN {print "{\"outputs\": ["}
$1=="STDOUT" {
    text = $5
    gsub(/\\n/, "\\n", text)
    gsub(/"/, "\\\"", text)
    if (first) print ","
    printf "  \"%s\"", text
    first = 1
}
END {print "\n]}"}
' out/trace.log
```

### The Key Principle

All projections are **pure functions**: they read the trace but never modify it or cause side effects.

## Tutorial 7: World Identity (3 minutes)

The World ID (WID) is a cryptographic hash of all world files.

```bash
# Compute the WID
cat world/.* | ./bin/hash.sh

# Or extract from trace
grep "^WORLD" out/trace.log

# The WID is immutable identity:
# - Same world files → same WID
# - Different files → different WID
# - WID in trace proves which world was used
```

Try modifying a world file:

```bash
# Change .genesis
echo "modified yes" >> world/.genesis

# Compute WID again
cat world/.* | ./bin/hash.sh
# Different hash! New identity.

# Restore original
git checkout world/.genesis  # or manually restore
```

## Tutorial 8: Pattern_Syntax (5 minutes)

ULP uses delimiter-based scope syntax with multiset validation.

### Valid Pattern_Syntax

```bash
# Balanced delimiters (multiset matches)
procedure demo
(([              # Open: ((, [
interrupt PRINT
](()             # Close: ], ((, )  → matches (([
```

### Testing Pattern_Syntax

```bash
# Valid examples
echo "(([ content ](()" | ./bin/proc.awk  # ✓ Valid
echo "([[ content ]])" | ./bin/proc.awk   # ✓ Valid
echo "()() content ()()" | ./bin/proc.awk # ✓ Valid

# Invalid examples (will error)
echo "(([ content ])" | ./bin/proc.awk    # ✗ Unbalanced
echo "([( content )])" | ./bin/proc.awk   # ✗ Wrong multiset
```

The parser validates that opening and closing signatures match as **multisets** (order-independent).

## Common Patterns

### Hello World

```bash
cat > interrupts/HELLO.sh << 'EOF'
#!/bin/sh
echo "Hello, World!"
EOF
chmod +x interrupts/HELLO.sh
echo "interrupt HELLO" > world/.interrupt
echo -e "procedure hello\n(([\ninterrupt HELLO\n](()" > world/.procedure
echo "" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
```

### Echo Input

```bash
cat > interrupts/ECHO.sh << 'EOF'
#!/bin/sh
cat  # Echo stdin to stdout
EOF
chmod +x interrupts/ECHO.sh
echo "interrupt ECHO" > world/.interrupt
echo -e "procedure echo\n(([\ninterrupt ECHO\n](()" > world/.procedure
echo "test message" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
```

### Uppercase Transformation

```bash
cat > interrupts/UPPER.sh << 'EOF'
#!/bin/sh
tr '[:lower:]' '[:upper:]'
EOF
chmod +x interrupts/UPPER.sh
echo "interrupt UPPER" > world/.interrupt
echo -e "procedure upper\n(([\ninterrupt UPPER\n](()" > world/.procedure
echo "hello world" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
# Output: HELLO WORLD
```

### Count Lines

```bash
cat > interrupts/COUNT.sh << 'EOF'
#!/bin/sh
wc -l | awk '{print "Line count:", $1}'
EOF
chmod +x interrupts/COUNT.sh
echo "interrupt COUNT" > world/.interrupt
echo -e "procedure count\n(([\ninterrupt COUNT\n](()" > world/.procedure
printf "line1\nline2\nline3\n" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log
# Output: Line count: 3
```

## Debugging Tips

### Trace isn't created?

```bash
# Check world validation
./bin/validate_world.sh world

# Common issues:
# - .procedure has unbalanced delimiters
# - World files contain non-identifier content
# - Interrupt handler not executable
```

### Output is wrong?

```bash
# Test the interrupt handler directly
echo "test input" | ./interrupts/YOUR_INTERRUPT.sh

# Check what's in the trace
grep "^STDOUT" out/trace.log

# View raw (unescaped) output
./bin/observe.sh world out/trace.log
```

### Trace isn't deterministic?

```bash
# Ensure interrupts don't use:
# - Random numbers
# - Current time/date
# - External network calls
# - File system state (other than stdin)

# Interrupts should be pure transformations of stdin → stdout
```

### Can't reconstruct from trace?

```bash
# Check self-encoding section
grep "^BEGIN.*encoding" out/trace.log
grep "^FILE" out/trace.log | wc -l  # Should show files
grep "^DATA" out/trace.log | wc -l  # Should show data lines

# Try decoding
./bin/decode_trace.sh out/trace.log test_decode/
ls -la test_decode/WORLD/
```

## Next Steps

### Learn the Philosophy

Read the [Conversation Series demonstrations](demos/conversation-series/):

```bash
cd demos/conversation-series

# Article 1: The Five Invariants
python3 project_text.py 01-five-invariants.trace | less

# Article 2: The Trace is the Machine
python3 project_text.py 02-trace-as-machine.trace | less

# Article 3: Projections
python3 project_text.py 03-projections.trace | less

# Article 4: Networking
python3 project_text.py 04-networking.trace | less
```

### Explore the Architecture

```bash
# Read the canonical specification
less ULP-v1.1-ARCHITECTURE.txt

# Understand the seal
less ULP-v1.1-SEAL.md

# Review the license
less LICENSE
```

### Build Something

Ideas for projects:
- **Static site generator**: Trace → HTML projection
- **Data pipeline**: CSV → transformation → JSON
- **Build system**: Reproducible builds via traces
- **Documentation**: Literate programming with traces
- **Testing**: Record test execution as traces

### Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Troubleshooting

### "Permission denied" errors

```bash
# Make sure scripts are executable
chmod +x bin/*.sh
chmod +x interrupts/*.sh

# Or use the verification script
./bin/verify_architecture.sh
```

### "Command not found: sha256sum"

```bash
# bin/hash.sh tries multiple commands
# Make sure you have one of:
which sha256sum   # Linux
which shasum      # macOS/BSD
which openssl     # Fallback

# On macOS: shasum is standard
# On Linux: sha256sum is standard
# On minimal systems: openssl dgst -sha256
```

### "awk: syntax error"

```bash
# Check your awk version
awk --version

# ULP works with:
# - gawk (GNU awk)
# - mawk (Mike's awk)
# - nawk (new awk)
# - busybox awk
# - macsOS awk

# If using very old awk, try installing gawk:
# apt-get install gawk     # Debian/Ubuntu
# brew install gawk        # macOS
```

### Trace has wrong architecture hash

```bash
# Verify the architecture file
sha256sum ULP-v1.1-ARCHITECTURE.txt

# Should output:
# 9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd

# If different, you may have a modified architecture
```

## Quick Reference

### Commands

```bash
# Create trace
echo "input" | ./bin/run.sh world out

# View trace (POSIX projection)
./bin/observe.sh world out/trace.log

# Decode trace
./bin/decode_trace.sh out/trace.log dest/

# Validate world
./bin/validate_world.sh world

# Run tests
./validate.sh

# Compute hash
./bin/hash.sh < file

# Parse Pattern_Syntax
./bin/proc.awk < world/.procedure
```

### File Structure

```bash
world/           # World definition (13 dotfiles)
interrupts/      # Interrupt handlers (.sh scripts)
bin/             # Core utilities
out/             # Output directory (traces)
demos/           # Demonstration traces
```

### Important Files

```bash
world/.procedure    # Pattern_Syntax execution structure
world/.interrupt    # Interrupt mappings
out/trace.log       # The trace (ground truth)
```

### Trace Sections

```bash
#METADATA           # Non-semantic metadata
HDR + WORLD         # Headers and identity
BEGIN encoding      # Self-encoding bundle
BEGIN input         # Stdin records
BEGIN execution     # Execution trace
SEAL                # Cryptographic seals
```

## Examples Repository

More examples at: [demos/conversation-series/](demos/conversation-series/)

Each demonstration trace uses ULP to explain ULP concepts - meta!

## Getting Help

- **Documentation**: README.md, ULP-v1.1-ARCHITECTURE.txt
- **Issues**: https://github.com/universal-life-protocol/ulp/issues
- **Discussions**: https://github.com/universal-life-protocol/ulp/discussions
- **Email**: brian@universal-life-protocol.com

## Philosophy Reminder

> "The trace is the machine. Everything else is a view."

- **Trace** = Ground truth (authoritative)
- **World** = Definition (non-executable data)
- **Projections** = Views (pure functions)
- **Execution** = Trace construction (not "running code")

Welcome to ULP v1.1!

---

*Happy tracing!*
