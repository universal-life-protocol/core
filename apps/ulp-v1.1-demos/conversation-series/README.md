# ULP v1.1 Conversation Series - Demonstration Traces

**Complete trace-based explanations of ULP core concepts**

## Overview

This directory contains **demonstration traces** that explain ULP v1.1 concepts through the trace format itself. Each trace is a complete, self-contained conversation about a key ULP principle.

These are NOT traditional documentation - they ARE ULP traces that happen to contain explanatory content. They demonstrate the paradigm by embodying it.

## The Four Articles

### Article 1: The Five Invariants
**File**: `01-five-invariants.trace`

Explains the five immutable architectural principles:
1. Trace is Append-Only and Authoritative
2. World Definition is Non-Executable
3. Projections are Pure Functions
4. Effects are Forward-Only via .interpose
5. Information Flows Forward-Only

**Key Concepts**: Architecture stability, invariant preservation, authority hierarchy

### Article 2: The Trace is the Machine
**File**: `02-trace-as-machine.trace`

Demonstrates the fundamental ULP insight:
- Execution IS trace construction (not "produces traces")
- The trace IS the machine (not "log of machine state")
- POSIX/browsers/etc are projections (not runtimes)

**Key Concepts**: Paradigm inversion, ground truth, projection equality

### Article 3: Projections - Pure Views of Truth
**File**: `03-projections.trace`

Explains projection algebra and the 16 sealed projection classes:
- Text: posix, json, markdown, pure
- Visual: w3c_html, w3c_dom, w3c_css
- 3D: webgl_3d, canvas_2d, vulkan
- Identity: bip32, bip39
- Analysis: graph, network_graph, print
- Meta: raw, canonical

**Key Concepts**: Purity constraints, lossiness, composition, interchangeability

### Article 4: Networking Without Addresses
**File**: `04-networking.trace`

Demonstrates declarative networking:
- `.network` file (capability declaration)
- `.connections` file (topology definition)
- Endpoint references (no IP addresses in traces)
- Late binding (same trace, different networks)

**Key Concepts**: Air-gapped by default, federation, protocol agnosticism

## Viewing the Traces

### Method 1: Raw Trace Inspection

```bash
# View the complete trace
cat 01-five-invariants.trace

# View only STDOUT lines (the conversation)
grep "^STDOUT" 01-five-invariants.trace | cut -f5-
```

### Method 2: ULP Projection (if you have ULP v1.1 installed)

```bash
# Extract conversation text (POSIX projection)
awk -F'\t' '$1=="STDOUT" && NF>=5 {
    text = $5
    gsub(/\\n/, "\n", text)
    gsub(/\\t/, "\t", text)
    print text
}' 01-five-invariants.trace
```

### Method 3: Python Projection (pure function)

```python
#!/usr/bin/env python3
"""
π_text: Pure projection from trace to readable text
Usage: python3 project_text.py 01-five-invariants.trace
"""
import sys

def project_text(trace_path):
    """Pure function: Trace → Text"""
    with open(trace_path, 'r') as f:
        for line in f:
            fields = line.strip().split('\t')
            if fields[0] == 'STDOUT' and len(fields) >= 5:
                text = fields[4]
                # Unescape
                text = text.replace('\\n', '\n')
                text = text.replace('\\t', '\t')
                text = text.replace('\\\\', '\\')
                print(text)

if __name__ == '__main__':
    project_text(sys.argv[1])
```

Save as `project_text.py` and run:

```bash
python3 project_text.py 01-five-invariants.trace
```

## Trace Format Structure

Each demonstration trace follows this structure:

```
#METADATA (non-semantic metadata)
├── version: ULP/1.1
├── article: <article_name>
├── author: Brian Thorne
├── date: 2025-12-31
└── architecture_hash: 9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd

HEADER (trace header)
├── HDR version 1
├── HDR article <name>
└── WORLD wid <hash>

BEGIN encoding (self-encoding section)
├── FILE records (world definition files)
├── DATA records (base64 encoded content)
└── END_FILE markers

BEGIN input (questions/prompts)
└── STDIN records (conversation prompts)

BEGIN execution (the conversation)
├── CLAUSE (procedure definition)
├── EXEC (execution instance)
├── EVENT records (conversation flow)
├── STDOUT records (explanation text) ← THE CONTENT
└── EXIT (completion status)

BEGIN projection (projection demonstrations)
└── EVENT PROJECT records

SEAL (cryptographic seals)
└── semantic_hash, article_hash
```

## Understanding the Traces

### They Are NOT Markdown

These files use `.trace` extension because they ARE ULP traces, not documentation files.

The explanatory text is in STDOUT records within the trace structure. This demonstrates that:
1. Traces can contain rich information
2. Projections extract meaningful content
3. The trace format is human-readable (when projected)

### They ARE Self-Encoding

Each trace contains (in the `encoding` section):
- World definition files
- Interrupt handlers (if applicable)
- Required utilities

This means each trace is **completely self-contained** and demonstrates the self-encoding principle.

### They Validate Architectural Principles

- **Immutability**: Traces are append-only (notice the structure)
- **Purity**: Only STDOUT records contain output (no side effects)
- **Determinism**: Same trace, same content (can verify with hash)
- **Authority**: The trace IS the explanation, not a log of explanation

## Verification

### Check Architecture Hash

All traces reference the sealed v1.1 architecture:

```bash
grep architecture_hash *.trace
```

Should show:
```
9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd
```

### Verify Trace Integrity

```bash
# Extract semantic content (non-METADATA lines)
grep -v "^#METADATA" 01-five-invariants.trace | sha256sum

# Compare with SEAL semantic_hash in the trace
grep "^SEAL.*semantic_hash" 01-five-invariants.trace
```

### Validate Structure

Each trace should have:

```bash
# Check required sections
for trace in *.trace; do
    echo "Checking $trace:"
    grep -q "^HDR" $trace && echo "  ✓ Header present"
    grep -q "^BEGIN.*encoding" $trace && echo "  ✓ Self-encoding present"
    grep -q "^BEGIN.*execution" $trace && echo "  ✓ Execution section present"
    grep -q "^STDOUT" $trace && echo "  ✓ Output records present"
    grep -q "^SEAL" $trace && echo "  ✓ Seal present"
done
```

## Educational Use

### For Learning ULP

1. **Start with Article 1** (Five Invariants) - foundational principles
2. **Read Article 2** (Trace as Machine) - paradigm shift
3. **Study Article 3** (Projections) - view layer
4. **Explore Article 4** (Networking) - advanced concepts

### For Teaching ULP

These traces can be:
- Projected to slideshows
- Converted to PDFs
- Rendered as web pages
- Displayed in terminals
- **All from the same trace files**

This demonstrates projection interchangeability.

### For Implementing ULP

The traces show correct formatting:
- Tab-separated fields
- Proper escaping
- Event ordering
- Self-encoding structure

Use them as reference implementations.

## Advanced Usage

### Create Your Own Demo Trace

```bash
# Use the ULP v1.1 system
cd ../..  # Go to ulp-v1.1 root

# Create a demo interrupt
cat > interrupts/DEMO.sh << 'EOF'
#!/bin/sh
# Your demo content here
cat << 'DEMO'
=== My ULP Demonstration ===

Explanation goes here...
DEMO
EOF

chmod +x interrupts/DEMO.sh

# Update world configuration
echo "DEMO" >> world/.include
echo "interrupt DEMO" >> world/.interrupt

# Generate the trace
echo "" | ./bin/run.sh world out

# Your demonstration is now in out/trace.log
```

### Compose Projections

```bash
# Extract text, convert to markdown, generate HTML
./project_text.py 01-five-invariants.trace > temp.txt
markdown temp.txt > five-invariants.html

# Or extract to JSON
python3 << 'EOF'
import json
import sys

def project_json(trace_path):
    """Pure projection: Trace → JSON"""
    lines = []
    with open(trace_path) as f:
        for line in f:
            fields = line.strip().split('\t')
            if fields[0] == 'STDOUT' and len(fields) >= 5:
                lines.append(fields[4])
    return json.dumps({"article": "five_invariants", "lines": lines}, indent=2)

print(project_json('01-five-invariants.trace'))
EOF
```

### Diff Traces

```bash
# Compare semantic content of two traces
diff <(grep -v "^#METADATA" 01-five-invariants.trace) \
     <(grep -v "^#METADATA" 02-trace-as-machine.trace)
```

## Contributing

To add a new conversation article:

1. Follow the trace format structure
2. Include proper METADATA headers
3. Reference the architecture hash: `9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd`
4. Include self-encoding section
5. Use STDOUT records for content
6. Add SEAL with semantic_hash

## License

These demonstration traces are part of the ULP v1.1 sealed architecture and are released under the Architectural Preservation License, which requires:

1. Preservation of all 5 core principles
2. Maintenance of authority hierarchy
3. Respect for closed vocabulary sets
4. Breaking version for architectural changes

## Contact

- **Author**: Brian Thorne
- **Email**: brian@universal-life-protocol.com
- **Repository**: https://github.com/universal-life-protocol/ulp

---

**Remember**: These ARE NOT logs. These ARE ULP traces.

The explanations you read are projections of trace truth.

*"The trace is the machine. Everything else is a view."*
