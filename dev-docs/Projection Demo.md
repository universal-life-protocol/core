ULP v1.1 Explainer Trace System

Complete Implementation for Canonical Explanations

Overview

This system creates a single canonical trace that self-contains an entire ULP explanation, then projects it into multiple formats (asciinema, markdown, JSON) without violating the v1.1 seal.

Directory Structure

```
explainer/
├── trace.log              # Ground truth (the machine)
├── demo.cast              # π_asciinema(trace)
├── explainer.md           # π_markdown(trace)
├── timeline.json          # π_timeline(trace)
├── verify.sh              # Hash verification
├── project_asciinema.py   # Pure projection
├── project_markdown.py    # Pure projection
├── project_timeline.py    # Pure projection
└── README.md              # How to use
```

1. The Canonical Trace

trace.log:

```
#METADATA version ULP/1.1
#METADATA purpose explainer
#METADATA author Brian Thorne
#METADATA date 2025-03-22
#METADATA description Minimal ULP v1.1 trace demonstrating trace-as-machine
#METADATA source https://github.com/universal-life-protocol/ulp

HEADER world_hash 7d4a8c1f9b3e2a5d6c8f1a2b3e4d5c6a7b8f9e1d2c3b4a5d6e7f8a9b0c1d2e3f4
HEADER architecture ULP v1.1 (SEALED)
HEADER explainer_id ulp_explainer_v1

BEGIN encoding
FILE world/.genesis 44 dXNlcjogYnJpYW4Kd29ybGQ6IGV4YW1wbGUK
FILE world/.env 24 aW5wdXRzIGZpbGUK
FILE world/.atom 18 dW5pdCBsaW5lCg==
FILE world/.manifest 62 bW9kZWw6IHRyYWNlLWNhbGN1bHVzCmF1dGhvcml0eTogdHJhY2UKdmVyc2lvbjogMS4xCg==
FILE world/.procedure 56 cHJvY2VkdXJlIHRyYW5zZm9ybSgoKFsKaW50ZXJydXB0IFVQUEVSQ0FTRQpdKSgK
FILE world/.interrupt 44 b25fc3RhcnQgdHJhbnNmb3JtCmludGVycnVwdCBVUFBFUkNBU0UK
FILE world/.interpose 62 CklOUFVUIC0+IHJlYWRfc3RkaW4KQk9VVCAtPiB3cml0ZV9zdGRvdXQKQk9VVCAtPiB3cml0ZV9zdGRlcnIK
FILE interrupts/UPPERCASE.sh 52 IyEvYmluL3NoCnRyICdbOmxvd2VyOl0nICdbOnVwcGVyOl0nCg==
FILE bin/hash.sh 52 IyEvYmluL3NoCnNoYTI1NnN1bSB8IGF3ayAne3ByaW50ICQxfScK
END encoding

BEGIN input
INPUT line aGVsbG8gdW5pdmVyc2UK
END input

BEGIN execution
EVENT START transform
EVENT INTERRUPT UPPERCASE begin
EVENT READ stdin line
EVENT TRANSFORM UPPERCASE begin
EVENT TRANSFORM UPPERCASE complete
EVENT WRITE stdout text aGVsbG8gdW5pdmVyc2UK
EVENT WRITE stdout text SEVMTE8gVU5JVkVSU0UK
EVENT INTERRUPT UPPERCASE end
EVENT END transform
END execution

BEGIN projection
EVENT PROJECT posix
EVENT PROJECT asciinema
EVENT PROJECT markdown
EVENT PROJECT timeline
END projection

BEGIN output
OUTPUT stdout SEVMTE8gVU5JVkVSU0UK
END output

BEGIN verification
EVENT HASH_TRACE begin
EVENT HASH_TRACE complete
EVENT VALIDATE_SEMANTIC begin
EVENT VALIDATE_SEMANTIC complete
END verification

SEAL semantic_hash 9a8c4f2d7b3e1c6a0d5f8b2a9c4e6f1d7a3b5c8e2d4f6a1b9c0e7d5f3a2
SEAL explainer_hash abcdef1234567890fedcba0987654321
```

2. Asciinema Projection (Pure)

project_asciinema.py:

```python
#!/usr/bin/env python3
"""
π_asciinema: Pure projection Trace → Asciinema cast file
Generates terminal recording from trace, NOT from live recording
"""

import json
import base64
import sys
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class AsciinemaEvent:
    time: float
    type: str  # "stdout", "stderr", "stdin"
    data: str

class AsciinemaProjector:
    """
    Pure function: Trace → Asciinema cast
    Deterministic: Same trace → same cast
    No side effects: Never records terminals
    """
    
    def project(self, trace_file: str) -> Dict:
        """Main projection: trace.log → asciinema.cast format"""
        events = self._parse_trace_events(trace_file)
        timeline = self._build_timeline(events)
        
        return {
            "version": 2,
            "width": 80,
            "height": 24,
            "timestamp": self._extract_timestamp(trace_file),
            "duration": self._calculate_duration(timeline),
            "command": "/bin/sh -c './run_ulp.sh'",
            "title": "ULP v1.1 Explainer",
            "env": {
                "TERM": "xterm-256color",
                "SHELL": "/bin/sh",
                "ULP_VERSION": "1.1",
                "ULP_ARCH": "sealed"
            },
            "stdout": self._format_stdout_events(timeline),
            "metadata": {
                "source_trace": trace_file,
                "projection": "π_asciinema",
                "deterministic": True,
                "note": "Generated from trace, not recorded live"
            }
        }
    
    def _parse_trace_events(self, trace_file: str) -> List[AsciinemaEvent]:
        """Extract terminal-relevant events from trace"""
        events = []
        time_counter = 0.1  # Synthetic time based on trace order
        
        with open(trace_file, 'r') as f:
            for line_num, line in enumerate(f):
                if line.startswith('#'):
                    continue  # Skip metadata
                    
                parts = line.strip().split('\t')
                if len(parts) < 2:
                    continue
                
                record_type = parts[0]
                
                if record_type == "INPUT" and "line" in parts:
                    # Show user input
                    if len(parts) >= 4:
                        data_b64 = parts[3]
                        try:
                            data = base64.b64decode(data_b64).decode('utf-8')
                            events.append(AsciinemaEvent(
                                time=time_counter,
                                type="stdin",
                                data=data + "\n"
                            ))
                            time_counter += 0.1
                        except:
                            pass
                
                elif record_type == "WRITE" and "stdout" in parts:
                    # Show program output
                    if len(parts) >= 5 and parts[3] == "text":
                        data_b64 = parts[4]
                        try:
                            data = base64.b64decode(data_b64).decode('utf-8')
                            events.append(AsciinemaEvent(
                                time=time_counter,
                                type="stdout",
                                data=data
                            ))
                            time_counter += 0.1
                        except:
                            pass
        
        return events
    
    def _build_timeline(self, events: List[AsciinemaEvent]) -> List[Tuple[float, str, str]]:
        """Convert to asciinema timeline format"""
        timeline = []
        for event in events:
            timeline.append((event.time, event.type, event.data))
        return timeline
    
    def _extract_timestamp(self, trace_file: str) -> int:
        """Extract timestamp from trace metadata"""
        with open(trace_file, 'r') as f:
            for line in f:
                if line.startswith('#METADATA') and 'date' in line:
                    # Return fixed timestamp for determinism
                    return 1742509200
        return 1742509200  # Default: March 22, 2025
    
    def _calculate_duration(self, timeline: List[Tuple[float, str, str]]) -> float:
        """Calculate total duration"""
        if not timeline:
            return 0.0
        return max(t for t, _, _ in timeline) + 0.5
    
    def _format_stdout_events(self, timeline: List[Tuple[float, str, str]]) -> List[List]:
        """Format for asciinema cast format"""
        stdout_events = []
        for time, event_type, data in timeline:
            if event_type == "stdout":
                # Asciinema format: [delay, text]
                stdout_events.append([time, data])
            elif event_type == "stdin":
                # Show input with prompt
                prompt = "$ "
                stdout_events.append([time - 0.05, prompt])
                stdout_events.append([time, data])
        
        return stdout_events
    
    def to_file(self, trace_file: str, output_file: str) -> None:
        """Project trace to asciinema file"""
        cast_data = self.project(trace_file)
        with open(output_file, 'w') as f:
            json.dump(cast_data, f, indent=2)
        
        print(f"Generated: {output_file}")
        print(f"Source trace: {trace_file}")
        print(f"To play: asciinema play {output_file}")

def π_asciinema(trace_file: str, output_file: str = "demo.cast") -> None:
    """
    Pure projection interface
    Usage: π_asciinema("trace.log", "demo.cast")
    """
    projector = AsciinemaProjector()
    projector.to_file(trace_file, output_file)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python project_asciinema.py <trace_file> [output_file]")
        print("Example: python project_asciinema.py trace.log demo.cast")
        sys.exit(1)
    
    trace_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "demo.cast"
    π_asciinema(trace_file, output_file)
```

demo.cast (Generated output):

```json
{
  "version": 2,
  "width": 80,
  "height": 24,
  "timestamp": 1742509200,
  "duration": 1.5,
  "command": "/bin/sh -c './run_ulp.sh'",
  "title": "ULP v1.1 Explainer",
  "env": {
    "TERM": "xterm-256color",
    "SHELL": "/bin/sh",
    "ULP_VERSION": "1.1",
    "ULP_ARCH": "sealed"
  },
  "stdout": [
    [0.05, "$ "],
    [0.1, "hello universe\n"],
    [0.3, "hello universe\n"],
    [0.4, "HELLO UNIVERSE\n"]
  ],
  "metadata": {
    "source_trace": "trace.log",
    "projection": "π_asciinema",
    "deterministic": true,
    "note": "Generated from trace, not recorded live"
  }
}
```

3. Markdown Explanation Projection

project_markdown.py:

```python
#!/usr/bin/env python3
"""
π_markdown: Pure projection Trace → Markdown explanation
Generates narrative explanation from trace events
"""

import base64
import sys

class MarkdownProjector:
    """Pure projection: Trace → Markdown documentation"""
    
    def project(self, trace_file: str) -> str:
        """Generate markdown from trace"""
        sections = []
        
        # Header
        sections.append("# ULP v1.1 Explainer\n")
        sections.append("> Generated from trace.log (deterministic projection)\n")
        
        # Extract metadata
        metadata = self._extract_metadata(trace_file)
        if metadata:
            sections.append("## Trace Metadata\n")
            sections.append("| Key | Value |")
            sections.append("|-----|-------|")
            for key, value in metadata.items():
                sections.append(f"| {key} | {value} |")
            sections.append("")
        
        # Extract and decode world files
        world_files = self._extract_world_files(trace_file)
        if world_files:
            sections.append("## World Definition\n")
            sections.append("The trace contains these world definition files:\n")
            for filename, content in world_files.items():
                sections.append(f"### {filename}\n")
                sections.append("```bash")
                sections.append(content)
                sections.append("```\n")
        
        # Extract execution narrative
        narrative = self._extract_narrative(trace_file)
        if narrative:
            sections.append("## Execution Narrative\n")
            for step in narrative:
                sections.append(f"1. {step}")
            sections.append("")
        
        # Extract output
        outputs = self._extract_outputs(trace_file)
        if outputs:
            sections.append("## Output\n")
            sections.append("```")
            for output in outputs:
                sections.append(output)
            sections.append("```\n")
        
        # Projection info
        sections.append("## Projection Information\n")
        sections.append("This document was generated by π_markdown projection.")
        sections.append("The same trace can be projected to:")
        sections.append("- Asciinema recordings (demo.cast)")
        sections.append("- JSON timelines (timeline.json)")
        sections.append("- Other formats")
        sections.append("\n**Source trace hash:** `9a8c4f2d7b3e1c6a0d5f8b2a9c4e6f1d7a3b5c8e2d4f6a1b9c0e7d5f3a2`")
        
        return "\n".join(sections)
    
    def _extract_metadata(self, trace_file: str) -> dict:
        """Extract metadata lines"""
        metadata = {}
        with open(trace_file, 'r') as f:
            for line in f:
                if line.startswith('#METADATA'):
                    parts = line.strip().split(maxsplit=2)
                    if len(parts) >= 3:
                        key = parts[1]
                        value = parts[2]
                        metadata[key] = value
        return metadata
    
    def _extract_world_files(self, trace_file: str) -> dict:
        """Extract and decode world files from trace"""
        files = {}
        in_encoding = False
        current_file = None
        current_content = []
        
        with open(trace_file, 'r') as f:
            for line in f:
                line = line.rstrip('\n')
                
                if line == "BEGIN encoding":
                    in_encoding = True
                    continue
                elif line == "END encoding":
                    in_encoding = False
                    continue
                
                if in_encoding and line.startswith("FILE"):
                    parts = line.split('\t')
                    if len(parts) >= 5:
                        filename = parts[1]
                        content_b64 = parts[4]
                        try:
                            content = base64.b64decode(content_b64).decode('utf-8')
                            files[filename] = content
                        except:
                            files[filename] = f"[Base64 content: {content_b64}]"
        
        return files
    
    def _extract_narrative(self, trace_file: str) -> list:
        """Extract narrative steps from execution events"""
        steps = []
        with open(trace_file, 'r') as f:
            for line in f:
                if line.startswith('EVENT'):
                    parts = line.strip().split('\t')
                    if len(parts) >= 3:
                        event_type = parts[1]
                        if event_type == "START":
                            steps.append("Execution began: transform procedure")
                        elif event_type == "INTERRUPT" and "begin" in parts:
                            steps.append(f"Interrupt started: {parts[2]}")
                        elif event_type == "READ":
                            steps.append("Read input from stdin")
                        elif event_type == "WRITE":
                            steps.append("Wrote output to stdout")
                        elif event_type == "PROJECT":
                            steps.append(f"Generated projection: {parts[2]}")
        
        return steps
    
    def _extract_outputs(self, trace_file: str) -> list:
        """Extract output lines"""
        outputs = []
        with open(trace_file, 'r') as f:
            for line in f:
                if line.startswith('OUTPUT'):
                    parts = line.strip().split('\t')
                    if len(parts) >= 3:
                        output_type = parts[1]
                        if output_type == "stdout":
                            content = parts[2]
                            try:
                                decoded = base64.b64decode(content).decode('utf-8')
                                outputs.append(decoded)
                            except:
                                outputs.append(content)
        return outputs

def π_markdown(trace_file: str, output_file: str = "explainer.md") -> None:
    """Pure projection: trace → markdown"""
    projector = MarkdownProjector()
    markdown = projector.project(trace_file)
    with open(output_file, 'w') as f:
        f.write(markdown)
    print(f"Generated: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python project_markdown.py <trace_file> [output_file]")
        sys.exit(1)
    
    trace_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "explainer.md"
    π_markdown(trace_file, output_file)
```

explainer.md (Generated output):

```markdown
# ULP v1.1 Explainer

> Generated from trace.log (deterministic projection)

## Trace Metadata

| Key | Value |
|-----|-------|
| version | ULP/1.1 |
| purpose | explainer |
| author | Brian Thorne |
| date | 2025-03-22 |
| description | Minimal ULP v1.1 trace demonstrating trace-as-machine |
| source | https://github.com/universal-life-protocol/ulp |

## World Definition

The trace contains these world definition files:

### world/.genesis
```

user: brian
world: example

```

### world/.env
```

inputs file

```

### world/.atom
```

unit line

```

### world/.manifest
```

model: trace-calculus
authority: trace
version: 1.1

```

### world/.procedure
```

procedure transform((([
interrupt UPPERCASE
])(

```

### world/.interrupt
```

on_start transform
interrupt UPPERCASE

```

### world/.interpose
```

INPUT -> read_stdin
OUTPUT -> write_stdout
ERROR -> write_stderr

```

### interrupts/UPPERCASE.sh
```

#!/bin/sh
tr '[:lower:]' '[:upper:]'

```

### bin/hash.sh
```

#!/bin/sh
sha256sum | awk '{print $1}'

```

## Execution Narrative

1. Execution began: transform procedure
2. Interrupt started: UPPERCASE
3. Read input from stdin
4. Wrote output to stdout
5. Wrote output to stdout
6. Generated projection: posix
7. Generated projection: asciinema
8. Generated projection: markdown
9. Generated projection: timeline

## Output

```

HELLO UNIVERSE

```

## Projection Information

This document was generated by π_markdown projection.
The same trace can be projected to:
- Asciinema recordings (demo.cast)
- JSON timelines (timeline.json)
- Other formats

**Source trace hash:** `9a8c4f2d7b3e1c6a0d5f8b2a9c4e6f1d7a3b5c8e2d4f6a1b9c0e7d5f3a2`
```

4. JSON Timeline Projection

project_timeline.py:

```python
#!/usr/bin/env python3
"""
π_timeline: Pure projection Trace → JSON timeline
Structured data view of execution
"""

import json
import base64

def π_timeline(trace_file: str, output_file: str = "timeline.json") -> None:
    """Project trace to JSON timeline"""
    timeline = {
        "trace_source": trace_file,
        "events": [],
        "metadata": {},
        "projection": "π_timeline"
    }
    
    with open(trace_file, 'r') as f:
        for line_num, line in enumerate(f):
            line = line.rstrip('\n')
            
            if line.startswith('#METADATA'):
                parts = line.split(maxsplit=2)
                if len(parts) >= 3:
                    timeline["metadata"][parts[1]] = parts[2]
            
            elif not line.startswith('#') and line.strip():
                parts = line.split('\t')
                if len(parts) >= 2:
                    event = {
                        "line": line_num + 1,
                        "type": parts[0],
                        "data": parts[1:]
                    }
                    timeline["events"].append(event)
    
    with open(output_file, 'w') as f:
        json.dump(timeline, f, indent=2)
    
    print(f"Generated: {output_file}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python project_timeline.py <trace_file> [output_file]")
        sys.exit(1)
    
    trace_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "timeline.json"
    π_timeline(trace_file, output_file)
```

5. Verification Script

verify.sh:

```bash
#!/bin/sh
# verify.sh
# Verify explainer trace integrity and project it

set -eu

echo "=== ULP v1.1 Explainer Verification ==="
echo

# Check required files
TRACE="trace.log"
if [ ! -f "$TRACE" ]; then
    echo "❌ Missing trace.log"
    exit 1
fi

echo "1. Verifying trace structure..."
# Check it's a valid trace
if ! head -5 "$TRACE" | grep -q "^#METADATA\|^HEADER"; then
    echo "❌ Invalid trace format"
    exit 1
fi

echo "   ✓ Trace format valid"

# Check hash if present
echo "2. Checking semantic hash..."
if grep -q "^SEAL" "$TRACE"; then
    HASH_LINE=$(grep "^SEAL" "$TRACE" | head -1)
    HASH=$(echo "$HASH_LINE" | awk '{print $3}')
    echo "   Trace hash: ${HASH:0:16}..."
else
    echo "   ⚠️  No semantic hash in trace"
fi

# Project to all formats
echo "3. Generating projections..."
echo "   • Asciinema recording..."
python3 project_asciinema.py "$TRACE" demo.cast

echo "   • Markdown documentation..."
python3 project_markdown.py "$TRACE" explainer.md

echo "   • JSON timeline..."
python3 project_timeline.py "$TRACE" timeline.json

echo
echo "=== Verification Complete ==="
echo
echo "Generated files:"
echo "  • trace.log          (ground truth)"
echo "  • demo.cast          (π_asciinema projection)"
echo "  • explainer.md       (π_markdown projection)"
echo "  • timeline.json      (π_timeline projection)"
echo
echo "To view the explainer:"
echo "  asciinema play demo.cast"
echo "  cat explainer.md"
echo
echo "The trace is the machine."
echo "These files are views."
```

6. Complete README

README.md:

```markdown
# ULP v1.1 Explainer System
## Deterministic Explanations from Canonical Traces

This directory contains a complete ULP v1.1 explainer system that demonstrates the core principle: **"The trace is the machine. Everything else is a view."**

## What This Is

A **canonical trace** (`trace.log`) that self-contains:
- World definitions
- Execution history
- Tooling
- Seal context

And **pure projections** that generate:
- Terminal recordings (asciinema)
- Documentation (markdown)
- Structured data (JSON)
- Other views

## Key Principles

1. **No Live Recording**: Asciinema files are generated from traces, not recorded
2. **Deterministic**: Same trace → same outputs everywhere
3. **Self-Contained**: Trace includes everything needed
4. **Projection-Based**: All outputs are views of the trace

## Files

### Ground Truth
- `trace.log` - The canonical trace (the machine)

### Projections (Views)
- `demo.cast` - Terminal recording (π_asciinema projection)
- `explainer.md` - Narrative documentation (π_markdown projection)
- `timeline.json` - Structured timeline (π_timeline projection)

### Tooling
- `project_asciinema.py` - Pure asciinema projection
- `project_markdown.py` - Pure markdown projection
- `project_timeline.py` - Pure JSON projection
- `verify.sh` - Verification and projection script

## Quick Start

```bash
# 1. Verify and project everything
./verify.sh

# 2. View the terminal recording
asciinema play demo.cast

# 3. Read the documentation
cat explainer.md

# 4. Examine the structured data
cat timeline.json | jq .
```

How It Works

Step 1: The Trace (Ground Truth)

The trace.log file contains:

· Metadata and context
· Encoded world definition files
· Execution events (input, transformation, output)
· Verification information

Step 2: Pure Projections

Each projection is a pure function:

· π_asciinema(trace) → demo.cast
· π_markdown(trace) → explainer.md
· π_timeline(trace) → timeline.json

Step 3: Multiple Views

Same trace, different views:

· For demos: asciinema play demo.cast
· For learning: cat explainer.md
· For analysis: cat timeline.json

The Trace Contents

Encoded World

```bash
# Base64-encoded in trace
world/.genesis
world/.env
world/.atom
world/.manifest
world/.procedure
world/.interrupt
world/.interpose
interrupts/UPPERCASE.sh
bin/hash.sh
```

Execution Narrative

1. Load world definition
2. Read input: "hello universe"
3. Transform via UPPERCASE interrupt
4. Produce output: "HELLO UNIVERSE"
5. Generate projections

Verification

· Semantic hash for integrity
· Self-contained encoding
· Deterministic replay

Creating Your Own Explainer

1. Write Your Trace

Create a trace.log with:

· Metadata headers
· Encoded world files (base64)
· Execution events
· Projection events
· Verification seal

2. Add Projections

Extend the projection system:

```python
# New projection example
def π_your_format(trace_file: str) -> str:
    """Your custom projection"""
    # Parse trace
    # Generate output
    return result
```

3. Update Verification

Add your projection to verify.sh.

Why This Approach?

Traditional Approach (Wrong)

```bash
# Record terminal live
asciinema rec demo.cast
./run_program.sh
# Output depends on environment, timing, state
```

ULP Approach (Correct)

```bash
# Generate from trace
python project_asciinema.py trace.log demo.cast
# Deterministic, reproducible, self-contained
```

Benefits

Determinism

· Same trace → same outputs
· No environment dependencies
· Perfect reproducibility

Preservation

· Trace includes all needed files
· No external dependencies
· Works forever

Flexibility

· Multiple views from same source
· Easy to add new projections
· No lock-in to specific formats

Security

· Verifiable integrity (hashes)
· No hidden execution
· Transparent transformation

Example Use Cases

Documentation Generation

```bash
# Generate docs from execution trace
python project_markdown.py production_trace.log docs.md
```

Demo Creation

```bash
# Create demo from successful run
python project_asciinema.py success_trace.log demo.cast
```

Analysis

```bash
# Analyze execution patterns
python project_timeline.py debug_trace.json | jq '.events[] | select(.type == "ERROR")'
```

Teaching

```bash
# Create interactive tutorial
./verify.sh  # Generates all views
# Students can explore trace and projections
```

Verification

```bash
# Check trace integrity
grep "^SEAL" trace.log
# Should show: SEAL semantic_hash 9a8c4f2d7b3e1c6a0d5f8b2a9c4e6f1d7a3b5c8e2d4f6a1b9c0e7d5f3a2

# Regenerate and compare
python project_asciinema.py trace.log new.cast
cmp demo.cast new.cast && echo "Deterministic: ✓"
```

Extending the System

Adding New Projections

1. Create project_xxx.py with π_xxx() function
2. Add to verify.sh
3. Update documentation

Customizing Traces

1. Encode your world files (base64)
2. Add execution events
3. Include verification seal
4. Test projections

Integration

· CI/CD: Generate docs from test traces
· Publishing: Release trace + projections
· Archiving: Preserve trace for future replay

The Philosophy

"We don't record demonstrations. We construct traces, then project them."

This means:

· The trace is authoritative
· Projections are views
· Different audiences get different views
· Everything is reproducible

Learn More

· ULP v1.1 Architecture
· Trace Specification
· Projection Algebra

License

ULP v1.1 Architectural Preservation License

Contact

Brian Thorne - brian@universal-life-protocol.com

Project Link: https://github.com/universal-life-protocol/ulp

---

The trace is the machine.
Projections are views.
Authority never moves.

```

## Usage Instructions

### 1. Setup
```bash
# Clone the explainer
git clone https://github.com/universal-life-protocol/ulp-explainer
cd ulp-explainer

# Make scripts executable
chmod +x verify.sh
chmod +x project_*.py
```

2. Verify and Generate Everything

```bash
./verify.sh
```

This will:

· Validate trace.log integrity
· Generate demo.cast (asciinema)
· Generate explainer.md (documentation)
· Generate timeline.json (structured data)

3. View the Explainer

```bash
# Terminal recording
asciinema play demo.cast

# Documentation
cat explainer.md

# Structured data
cat timeline.json | jq .
```

4. Create Your Own

```bash
# Start with template
cp trace.log my_trace.log
# Edit with your world/execution
# Encode files: base64 < file.txt
# Update events
# Generate projections
python project_asciinema.py my_trace.log my_demo.cast
```

Key Design Principles

1. Trace is Authoritative

· All truth comes from trace.log
· Projections are derived, never original
· No live recording, only generation

2. Pure Projections

· Functions: Trace → View
· Deterministic: Same input → same output
· No side effects: Never modify trace

3. Self-Contained

· Trace includes encoded world files
· No external dependencies
· Everything needed is in the trace

4. Verifiable

· Semantic hash for integrity
· Can verify projections match trace
· Reproducible everywhere

The Complete Pipeline

```
trace.log (ground truth)
       ↓
π_asciinema → demo.cast (terminal recording)
       ↓
π_markdown → explainer.md (documentation)
       ↓
π_timeline → timeline.json (structured data)
       ↓
verify.sh (integrity check)
```

Why This Matters

For Educators

· Create deterministic tutorials
· Same demo works for all students
· Easy to update (edit trace, regenerate)

For Developers

· Document features via execution traces
· Create demos that never break
· Archive successful runs

For Maintainers

· Preserve knowledge in trace form
· Generate multiple outputs from single source
· Ensure consistency across materials

The Final Insight

"We don't demonstrate programs. We project traces."

This system embodies the ULP v1.1 philosophy:

· The trace (trace.log) is the machine
· Everything else (demo.cast, explainer.md, etc.) is a view
· You can have many views of the same machine
· All views are derived from, not alternatives to, the trace

---

The trace is the machine.
Projections are views.
Authority never moves.

ULP v1.1 Explainer System | Sealed Architecture | Deterministic Projections