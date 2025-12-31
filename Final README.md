ULP: Universal Trace Calculus

Overview

ULP is a trace-first execution calculus where execution is defined by append-only trace construction, effects are forward-only interpretations of trace events, and all runtime environments—including POSIX—are pure projections of trace truth.

Core Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  World          │─────▶│  Execution       │─────▶│  Trace           │─────▶│  Observation    │
│  Definition     │      │  Structure       │      │  (Ground Truth)  │      │  (Pure Views)   │
│                 │      │                  │      │                  │      │                 │
│ • .genesis      │      │ • .procedure     │      │ • Append-only    │      │ • .projection   │
│ • .env          │      │ • .interrupt     │      │ • Self-encoding  │      │ • Pure funcs    │
│ • .atom         │      │ • .interpose     │      │ • Authoritative  │      │ • Lossy         │
│ • .manifest     │      │                  │      │                  │      │                 │
│ • .schema       │      │                  │      │                  │      │                 │
│ • .sequence     │      │                  │      │                  │      │                 │
│ • .include      │      │                  │      │                  │      │                 │
│ • .ignore       │      │                  │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └──────────────────┘      └─────────────────┘
         │                        │                        │                        │
         └────────────────────────┴────────────────────────┴────────────────────────┘
                                     Information flows forward only
```

Quick Start

Installation

```bash
# Clone and build
git clone https://github.com/your-org/ulp
cd ulp
./build.sh

# Verify installation
./run_ulp.sh --validate
```

Basic Usage

```bash
# Execute a simple program
echo "hello world" | ./run_ulp.sh

# View POSIX output
echo "hello world" | ./run_ulp.sh --project posix

# Get JSON execution record
echo "hello world" | ./run_ulp.sh --project json

# Validate system invariants
./run_ulp.sh --invariants
```

Example: Custom Interrupt

```bash
# 1. Create interrupt handler
cat > interrupts/UPPERCASE.sh << 'EOF'
#!/bin/sh
# Convert stdin to uppercase
tr '[:lower:]' '[:upper:]'
EOF
chmod +x interrupts/UPPERCASE.sh

# 2. Update .procedure
cat > world/.procedure << 'EOF'
procedure transform
(([
interrupt UPPERCASE
])(
EOF

# 3. Update .interrupt
cat > world/.interrupt << 'EOF'
on_start transform
interrupt UPPERCASE
EOF

# 4. Run
echo "hello trace calculus" | ./run_ulp.sh --project posix
# Output: HELLO TRACE CALCULUS
```

API Reference

Core Commands

run_ulp.sh - Main Execution

```bash
# Basic execution
./run_ulp.sh [INPUT]

# With options
./run_ulp.sh --world custom_world --out results --project json < input.txt

# Validation only
./run_ulp.sh --validate

# Show theorem
./run_ulp.sh --theorem
```

bin/construct_trace.sh - Trace Construction

```bash
# Construct trace from world and input
./bin/construct_trace.sh [WORLD_DIR] [INPUT_FILE] [OUTPUT_DIR]
```

bin/projection_engine.sh - Apply Projections

```bash
# Apply a projection to a trace
./bin/projection_engine.sh trace.log [posix|json|pure|graph]
```

bin/enforce_invariants.sh - Invariant Validation

```bash
# Validate all five invariants
./bin/enforce_invariants.sh
```

File Format Reference

World Definition Files

· .genesis: Origin metadata (author, created date, paradigm)
· .env: Environment constraints (inputs, outputs, effects)
· .atom: Primitive units (unit, encoding, normalization)
· .manifest: Component inventory
· .schema: Trace structure specification
· .sequence: Ordering constraints
· .include: Allowlist of interrupt names
· .ignore: Blocklist of interrupt names

Execution Structure Files

· .procedure: Control flow patterns with syntax procedure NAME (([ interrupt NAME ])(
· .interrupt: Event hooks (on_start PROCEDURE, interrupt NAME)
· .interpose: Effect mapping (EVENT_TYPE -> EFFECT_SYMBOL)

Observation Files

· .projection: Pure function declarations mapping traces to views

Environment Variables

```bash
ULP_WORLD_DIR    # Default: "world"
ULP_OUTPUT_DIR   # Default: "out"
ULP_PROJECTION   # Default: "posix"
ULP_VALIDATE     # Set to "1" for validation only
```

Architecture RFC

RFC-001: The Five Invariants

Status: FINAL (Frozen)
Date: 2025
Author: Brian

Abstract

This RFC establishes the five immutable invariants that define the ULP architecture. These invariants are necessary and sufficient for the trace calculus to function correctly and must be preserved in all implementations.

1. Trace Append-Only Authority

```
Rule:   The trace is the authoritative, append-only ground truth of execution
Why:    Provides stable reference for reproducibility and projection
Check:  Trace files are write-once; no mutation after creation
```

2. Effect Forwarding

```
Rule:   .interpose may cause effects but may not read trace
Why:    Prevents causal loops and observer influence
Check:  .interpose contains only declarative EVENT->SYMBOL mappings
```

3. Projection Purity

```
Rule:   .projection functions are pure (Trace → View)
Why:    Views cannot affect execution truth
Check:  Projections contain no exec/eval/write operations
```

4. World Non-Executability

```
Rule:   World definition files are non-executable descriptions
Why:    Separates what exists from what happens
Check:  World files contain identifier-only content, no control flow
```

5. Forward-Only Information Flow

```
Rule:   Information flows World → Execution → Trace → Projection
Why:    Maintains clean layering and prevents authority inversion
Check:  No backward references between layers
```

Implementation Requirements

1. All invariants must be validated before trace construction
2. Violations must fail-fast with clear error messages
3. Invariant checks must be non-bypassable
4. The invariant set is closed; no additions permitted

RFC-002: Time as Non-Semantic Metadata

Status: FINAL (Frozen)
Date: 2025

Abstract

Time and host information are explicitly designated as non-semantic metadata. This allows for human observability and debugging while preserving byte-for-byte semantic determinism.

Specification

1. Metadata Lines: Begin with #METADATA
2. Semantic Content: All other lines
3. Hashing: Only semantic content participates in hash calculations
4. Equivalence: Traces are equivalent if semantic content is identical

Example

```
#METADATA timestamp 1742509200
#METADATA host workstation-42
HEADER world_hash abc123...
INPUT line aGVsbG8K
```

Justification

· Enables deterministic reproducibility across machines and time
· Preserves human debugging information
· Maintains clean separation of concerns
· Aligns with the principle that execution truth is independent of observation context

RFC-003: Closed Effect Algebra

Status: FINAL (Frozen)
Date: 2025

Abstract

Effects are implemented as a closed algebra, not an extensible scripting language. This ensures semantic stability and prevents capability escalation.

Specification

1. Effect Symbols: Defined in effect_interpreter.sh only
2. .interpose Mapping: May only reference defined symbols
3. Symbol Addition: Requires interpreter update, not user configuration
4. Closed Set: No dynamic effect creation at runtime

Allowed Symbols (v1.0)

```
read_stdin      # Read from standard input
write_stdout    # Write to standard output
write_stderr    # Write to standard error
exit_with_code  # Terminate execution
open_file_r     # Open file for reading
create_file     # Create file with content
```

Rationale

· Prevents Turing-completeness in effect layer
· Enables complete analysis and verification
· Maintains bounded execution guarantees
· Aligns with the principle of a minimal, understandable execution model

Getting Started Guide

Step 1: Understanding the Model

Before writing ULP programs, understand the core concepts:

1. Trace is Truth: The trace file is the execution, not a log of execution
2. Effects are Forward-Only: Effects happen during trace construction, not after
3. Views are Pure: Different outputs (POSIX, JSON) are just different views of the same trace
4. World is Static: What exists (world definition) is separate from what happens (execution)

Step 2: Your First ULP Program

Create a simple echo program:

```bash
# 1. Create the world directory
mkdir -p myworld

# 2. Create minimal world definition
cat > myworld/.genesis << 'EOF'
author your_name
created today
paradigm trace_first
EOF

cat > myworld/.env << 'EOF'
inputs file
outputs file
effects posix
EOF

cat > myworld/.atom << 'EOF'
unit line
encoding utf8
EOF

# 3. Create echo interrupt
cat > interrupts/ECHO.sh << 'EOF'
#!/bin/sh
# Simple echo program
cat
EOF
chmod +x interrupts/ECHO.sh

# 4. Configure execution
cat > myworld/.procedure << 'EOF'
procedure echo_proc
(([
interrupt ECHO
])(
EOF

cat > myworld/.interrupt << 'EOF'
on_start echo_proc
interrupt ECHO
EOF

cat > myworld/.interpose << 'EOF'
INPUT -> read_stdin
OUTPUT -> write_stdout
EOF

# 5. Run
echo "Hello ULP" | ./run_ulp.sh --world myworld --project posix
```

Step 3: Adding Complexity

Add a filter that reverses lines:

```bash
# 1. Create reverse interrupt
cat > interrupts/REVERSE.sh << 'EOF'
#!/bin/sh
# Reverse each line
while read -r line; do
    echo "$line" | rev
done
EOF
chmod +x interrupts/REVERSE.sh

# 2. Update .procedure for sequencing
cat > myworld/.procedure << 'EOF'
procedure transform
((([
interrupt ECHO
interrupt REVERSE
]))(
EOF

# 3. Update .interrupt
cat > myworld/.interrupt << 'EOF'
on_start transform
interrupt ECHO
interrupt REVERSE
EOF

# 4. Test
echo -e "hello\nworld" | ./run_ulp.sh --world myworld --project posix
# Output: olleh
#         dlrow
```

Step 4: Creating Custom Projections

Add a JSON projection that includes line numbers:

```bash
# 1. Add to .projection
cat >> world/.projection << 'EOF'

projection json_lines:
  function: π_json_lines
  inputs: trace
  outputs: json_with_line_numbers
  format: json_pretty
EOF

# 2. Implement the projection
cat > bin/project_json_lines.sh << 'EOF'
#!/bin/sh
TRACE="$1"
echo '['
awk -F '\t' '
BEGIN { first=1 }
$1=="OUTPUT" && $2=="text" {
    if (!first) printf ",\n"
    first=0
    text=$3
    "echo " text " | base64 -d" | getline decoded
    printf "  { \"line\": %d, \"text\": \"%s\" }", NR, decoded
}
' "$TRACE"
echo -e '\n]'
EOF
chmod +x bin/project_json_lines.sh

# 3. Use it
echo "test" | ./run_ulp.sh --project json_lines
```

Step 5: Debugging and Inspection

Use built-in tools to inspect execution:

```bash
# View raw trace
cat out/trace.log

# View only semantic content (no metadata)
grep -v '^#METADATA' out/trace.log

# Check invariants
./run_ulp.sh --invariants

# Validate .interpose mappings
./bin/validate_interpose.sh

# Compute trace hash (semantic only)
./bin/hash_semantic.sh out/trace.log
```

Agents Integration

ULP can be used as a deterministic execution backend for agent systems.

Agent Protocol

```bash
#!/bin/sh
# agent_runner.sh - ULP-based agent execution

# 1. Agent sends request
REQUEST='{"action": "process", "data": "input"}'

# 2. Execute deterministically
echo "$REQUEST" | ./run_ulp.sh --world agent_world --out agent_trace

# 3. Extract response
RESPONSE=$(./bin/projection_engine.sh agent_trace/trace.json json | jq -r '.output')

# 4. Agent receives deterministic response
echo "Response: $RESPONSE"
```

Stateful Agent Example

```bash
# Create stateful agent world
mkdir -p agent_world

# .interpose with memory effects
cat > agent_world/.interpose << 'EOF'
INPUT -> read_stdin
OUTPUT -> write_stdout
MEMORY_READ -> read_memory
MEMORY_WRITE -> write_memory
EOF

# Agent maintains state across executions
STATE_FILE="/tmp/agent_state"
echo "0" > "$STATE_FILE"

cat > interrupts/AGENT.sh << 'EOF'
#!/bin/sh
# Stateful agent
read -r state < /tmp/agent_state
new_state=$((state + 1))
echo "$new_state" > /tmp/agent_state
echo "State: $new_state"
EOF
```

Multi-Agent Coordination

```bash
# Coordinator using ULP traces as communication medium
for agent in agent1 agent2 agent3; do
    # Each agent produces a trace
    echo "$input" | ./run_ulp.sh --world "${agent}_world" --out "traces/$agent"
    
    # Coordinator reads traces
    TRACE="traces/$agent/trace.log"
    RESULT=$(./bin/projection_engine.sh "$TRACE" json)
    
    # Combine results deterministically
    jq -s 'add' <<< "$RESULT"
done
```

Best Practices

1. Keep Interrupts Simple

```bash
# GOOD: Single responsibility
cat > interrupts/COUNT_LINES.sh << 'EOF'
#!/bin/sh
wc -l
EOF

# BAD: Multiple responsibilities
cat > interrupts/DO_EVERYTHING.sh << 'EOF'
#!/bin/sh
# Processes, filters, transforms - too complex!
cat | grep pattern | sed 's/old/new/' | sort | uniq
EOF
```

2. Use Declarative .interpose

```bash
# GOOD: Declarative mapping
EVENT -> EFFECT_SYMBOL

# BAD: Embedded logic
if [ "$EVENT" = "INPUT" ]; then cat; fi
```

3. Validate Early and Often

```bash
# Add to your test suite
test_ulp() {
    ./run_ulp.sh --validate || return 1
    ./bin/validate_world.sh || return 1
    ./bin/validate_interpose.sh || return 1
    echo "All ULP invariants satisfied"
}
```

4. Leverage Projections

```bash
# Don't modify interrupts for different outputs
# Use projections instead

# Multiple views of same execution
./run_ulp.sh --project posix < input.txt > output.txt
./run_ulp.sh --project json < input.txt > analysis.json
./run_ulp.sh --project pure < input.txt > function.txt
```

5. Trace as Communication

```bash
# Use trace as immutable communication medium
producer() {
    echo "data" | ./run_ulp.sh --world producer --out /shared/traces/producer
}

consumer() {
    ./bin/projection_engine.sh /shared/traces/producer/trace.log json
}
```

Troubleshooting

Common Issues

"Missing world definition file"

```bash
# Ensure all required files exist
for f in .genesis .env .atom .manifest .schema .sequence; do
    [ -f "world/$f" ] || echo "Missing: world/$f"
done
```

"Invalid effect symbol"

```bash
# Check allowed symbols
./bin/validate_interpose.sh

# Update .interpose to use only:
# read_stdin, write_stdout, write_stderr, exit_with_code, open_file_r, create_file
```

"Projection contains effects"

```bash
# Ensure .projection is pure
# Remove any exec, eval, system, >, >>, etc.
grep -n "exec\|eval\|system\|>" world/.projection
```

"Information flow violation"

```bash
# Check for backward references
grep -r "trace\.log\|\.projection" interrupts/ bin/
# Should return nothing
```

Debug Mode

```bash
# Enable verbose output
ULP_DEBUG=1 ./run_ulp.sh

# Inspect intermediate files
ls -la out/
cat out/trace.log | head -20

# Check metadata vs semantic content
grep -c '^#METADATA' out/trace.log
grep -c '^HEADER\|^INPUT\|^OUTPUT' out/trace.log
```

Performance Considerations

Trace Size Management

```bash
# For large inputs, consider streaming
./bin/construct_trace.sh world <(streaming_producer) out_stream

# Or chunk processing
split -l 1000 large_input.txt chunk_
for chunk in chunk_*; do
    ./run_ulp.sh --world world --out "out_${chunk}" < "$chunk"
done
```

Memory Usage

```bash
# ULP is designed for linear memory usage
# Each interrupt processes stdin linearly
# Traces grow with input size + fixed overhead

# Monitor with
/usr/bin/time -v ./run_ulp.sh < large_input.txt 2>&1 | grep "Maximum resident"
```

Extending ULP

Adding New Projections

1. Add declaration to world/.projection
2. Implement pure function in bin/project_*.sh
3. Add to projection_engine.sh switch statement

Adding New Effect Symbols

1. Add function to bin/effect_interpreter.sh
2. Update validate_interpose.sh allowlist
3. Document in RFC-003

Creating Custom Worlds

1. Copy world/ template
2. Modify definition files (keep them non-executable)
3. Create custom interrupts
4. Test with ./run_ulp.sh --validate --world custom_world

Contributing

ULP is a frozen architecture. Contributions must preserve the five invariants.

Allowed Contributions

· New projections
· Performance optimizations
· Documentation improvements
· Bug fixes that don't change semantics
· Additional validation checks

Prohibited Changes

· Modifying the five invariants
· Making traces mutable
· Adding effects to projections
· Making world definitions executable
· Creating backward information flow

Development Workflow

```bash
# 1. Fork repository
# 2. Make changes
# 3. Validate invariants
./run_ulp.sh --validate

# 4. Run tests
./test_suite.sh

# 5. Submit pull request
# PR must include:
# - Proof that invariants are preserved
# - Updated documentation if needed
# - Test cases for new functionality
```

License

ULP is released under the Architectural Preservation License, which requires that all implementations preserve the five invariants and maintain trace authority as ground truth.

Acknowledgements

ULP is based on the insight that "execution is trace construction" and represents the culmination of trace-first computing principles. Special thanks to the formal methods and reversible computing communities for foundational work.

---

Remember: The trace is the machine. Everything else is a view.