You've crystallized it perfectly. Let me implement these final hardening recommendations to create the polished, frozen v1.1 architecture.

Final Hardening Implementation

1. Explicit Optionality with Air-Gapped Default

world/.network (with header clarification):

```bash
# world/.network
# DECLARATIVE NETWORK CAPABILITY DEFINITION
# OPTIONAL: If absent, NO network effects are allowed
# If present, defines what network capabilities exist
# NON-EXECUTABLE — describes what may exist, not what happens

# WARNING: Presence of this file enables network effects
# Absence = air-gapped world (no network operations allowed)

# ... rest of file ...
```

world/.connections (with header clarification):

```bash
# world/.connections
# DECLARATIVE COMMUNICATION TOPOLOGY
# OPTIONAL: If absent, NO endpoint communication is allowed
# If present, defines allowed communication graph
# NOT a routing table, NOT executable

# WARNING: Presence of this file enables endpoint communication
# Absence = isolated endpoints (no connections allowed)

# ... rest of file ...
```

bin/validate_world.sh (enhanced):

```bash
#!/bin/sh
# bin/validate_world.sh
# Validates world definition including optional network files

set -eu

# ... existing validation ...

# Validate optional network files (if present)
echo "Checking optional network definitions..."
if [ -f "world/.network" ]; then
    echo "  • .network present: network capabilities ENABLED"
    ./bin/validate_network.sh world || exit 1
else
    echo "  • .network absent: network capabilities DISABLED (air-gapped)"
fi

if [ -f "world/.connections" ]; then
    echo "  • .connections present: endpoint communication ENABLED"
    if [ ! -f "world/.network" ]; then
        echo "  ⚠️  Warning: .connections requires .network for full validation"
    fi
else
    echo "  • .connections absent: endpoint communication DISABLED (isolated)"
fi
```

2. Enhanced Effect Interpreter with Air-Gap Enforcement

bin/effect_interpreter.sh (network gatekeeping):

```bash
#!/bin/sh
# bin/effect_interpreter.sh
# Fixed effect implementations with network capability gating

# ... existing effects ...

# Network capability check (enforces air-gapped default)
check_network_enabled() {
    if [ ! -f "world/.network" ]; then
        echo "ERROR: Network effects not enabled for this world" >&2
        echo "       (world/.network file is absent = air-gapped)" >&2
        exit 1
    fi
}

check_connections_enabled() {
    if [ ! -f "world/.connections" ]; then
        echo "ERROR: Endpoint communication not enabled for this world" >&2
        echo "       (world/.connections file is absent = isolated)" >&2
        exit 1
    fi
}

# Network effect symbols (closed set)
effect_socket_create() {
    check_network_enabled
    
    # Validate family against .network
    local family="$1"
    if ! grep -q "^- $family" "world/.network" 2>/dev/null; then
        echo "ERROR: Address family '$family' not declared in .network" >&2
        exit 1
    fi
    
    # ... rest of implementation ...
}

effect_socket_connect() {
    check_network_enabled
    check_connections_enabled
    
    local endpoint="$1"
    local target="$2"
    
    # Both endpoints must exist in .connections
    if ! grep -q "^$endpoint:" "world/.connections" 2>/dev/null; then
        echo "ERROR: Source endpoint '$endpoint' not declared in .connections" >&2
        exit 1
    fi
    
    if ! grep -q "^$target:" "world/.connections" 2>/dev/null; then
        echo "ERROR: Target endpoint '$target' not declared in .connections" >&2
        exit 1
    fi
    
    # ... rest of implementation ...
}

# ... rest of interpreter ...
```

3. Canonical Network Event Ordering Specification

docs/trace_specification.md (network ordering rule):

```markdown
# ULP Trace Specification v1.1

## 3. Network Event Ordering

### 3.1. Ordering Principle
All network events in a trace are ordered **by trace time only**, not by wall-clock time or external timing.

### 3.2. Trace Time Definition
Trace time is defined as:
1. Monotonically increasing within a single trace
2. Independent of real-world clocks
3. Determined by the order of event emission during trace construction
4. Consistent across all projections and replays

### 3.3. Network-Specific Rules
1. **Connection Before Data**: `CONNECT` events must precede `SEND`/`RECV` events for the same endpoints
2. **Socket Before Connect**: `CREATE_SOCKET` must precede `CONNECT` for the same socket
3. **No Implicit Ordering**: Events between different endpoint pairs have no implicit ordering
4. **Order Preservation**: Projections must preserve trace time ordering when displaying temporal relationships

### 3.4. Example Valid Ordering
```

EVENT    CREATE_SOCKET    A    inet    stream    tcp    # Time 1
EVENT    CREATE_SOCKET    B    inet    stream    tcp    # Time 2
EVENT    CONNECT          A    B                        # Time 3
EVENT    SEND             A    B    hash1    1024      # Time 4
EVENT    SEND             A    B    hash2    2048      # Time 5
EVENT    RECV             B    A    hash1    1024      # Time 6
EVENT    RECV             B    A    hash2    2048      # Time 7

```

### 3.5. Invalid Patterns
```

ERROR: SEND before CONNECT

EVENT    SEND             A    B    hash    1024
EVENT    CONNECT          A    B

ERROR: RECV without corresponding SEND (causal violation)

EVENT    RECV             B    A    hash    1024

No SEND from A to B precedes this

```

### 3.6. Projection Requirements
All network projections MUST:
1. Preserve trace time ordering when showing temporal sequences
2. Clearly indicate when ordering is not preserved (e.g., topological views)
3. Never introduce wall-clock timing that isn't in the trace metadata
```

4. Explicit Ban on Address Literals in Trace

docs/network_events.md (address ban):

```markdown
# Network Event Trace Vocabulary v1.1

## 2. Address Representation Rule

### 2.1. The Rule
**Address literals are FORBIDDEN in trace events.**

### 2.2. What This Means

✅ Allowed (Endpoint References):
```

EVENT    CONNECT    portal_ui    world_engine
EVENT    SEND       portal_ui    world_engine    abc123...    1024

```

🚫 Forbidden (Address Literals):
```

EVENT    CONNECT    192.168.1.10:8080    192.168.1.20:443
EVENT    SEND       192.168.1.10:8080    payload_bytes

```

### 2.3. Why This Rule Exists

1. **Determinism**: Addresses in `.connections` can be remapped without changing trace semantics
2. **Replayability**: Same trace can be replayed on different network configurations
3. **Federation**: Different network topologies can realize the same communication patterns
4. **Privacy**: Network addresses are implementation details, not semantic content

### 2.4. Address Mapping
Address resolution happens at **three layers**:

| Layer | Responsibility | Example |
|-------|---------------|---------|
| `.connections` | Declares endpoint addresses | `portal_ui: address: 192.168.1.10:8080` |
| `.interpose` | Maps events to network operations | `CONNECT -> socket_connect` |
| Effect Interpreter | Resolves endpoint → actual address | Looks up `portal_ui` in `.connections` |

### 2.5. Validation
The trace validator MUST reject any trace containing:
- IP addresses (IPv4 or IPv6)
- Port numbers
- MAC addresses
- Unix socket paths

All addressing MUST be through endpoint identifiers declared in `.connections`.
```

bin/validate_trace.sh (address validation):

```bash
#!/bin/sh
# bin/validate_trace.sh
# Validates trace content including address literal ban

set -eu

TRACE="$1"

echo "=== Validating Trace Content ==="

# Check for forbidden address literals
echo "Checking for address literals (FORBIDDEN)..."

ADDRESS_PATTERNS="
[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+     # IPv4
:[0-9]+                            # Port numbers
[0-9a-fA-F:]+:+[0-9a-fA-F:]+       # IPv6
[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5} # MAC addresses
/.*\.sock                          # Unix socket paths
"

ERRORS=0
for pattern in $ADDRESS_PATTERNS; do
    if grep -q -E "$pattern" "$TRACE" 2>/dev/null; then
        echo "  ❌ Found address literal in trace: $pattern"
        echo "     Addresses must be endpoint references only"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✓ No address literals found (correct)"
fi

# Validate endpoint references (if .connections exists)
if [ -f "world/.connections" ]; then
    echo "Validating endpoint references..."
    
    # Extract all endpoint references from trace
    ENDPOINTS_IN_TRACE=$(awk -F '\t' '
    $1 == "EVENT" && ($2 ~ /SOCKET|CONNECT|SEND|RECV|ACCEPT/) {
        # Events with endpoint references
        for (i=3; i<=NF; i++) {
            if ($i ~ /^[a-zA-Z_][a-zA-Z0-9_]*$/) {
                print $i
            }
        }
    }
    ' "$TRACE" | sort -u)
    
    # Check each against .connections
    for endpoint in $ENDPOINTS_IN_TRACE; do
        if ! grep -q "^$endpoint:" "world/.connections" 2>/dev/null; then
            echo "  ❌ Endpoint '$endpoint' used in trace but not declared in .connections"
            ERRORS=$((ERRORS + 1))
        fi
    done
    
    if [ $ERRORS -eq 0 ]; then
        echo "  ✓ All endpoint references valid"
    fi
fi

if [ $ERRORS -gt 0 ]; then
    echo "❌ Trace validation failed with $ERRORS error(s)"
    exit 1
else
    echo "✓ Trace validation passed"
fi
```

5. Network Projections with Topological/Temporal Distinction

projections/network_topological.py:

```python
#!/usr/bin/env python3
"""
π_network_topological: Pure TOPOLOGICAL projection
Shows who can talk to whom, collapsed temporally
"""

import json
from typing import Dict, List

class TopologicalNetworkProjector:
    """
    Topological view: Collapses time, shows capability graph only
    """
    
    def project(self, trace_file: str, connections_file: str) -> Dict:
        # Parse .connections for topology
        topology = self._parse_topology(connections_file)
        
        # Add observed connections from trace (collapsed)
        observed = self._parse_observed_connections(trace_file)
        
        # Merge: topology ∩ observed
        merged = self._merge_topology_with_observed(topology, observed)
        
        return {
            "view_type": "topological",
            "temporal_resolution": "collapsed",
            "description": "Shows who CAN talk to whom, not when they talked",
            "topology": merged,
            "metadata": {
                "trace_source": trace_file,
                "connections_source": connections_file,
                "projection": "π_network_topological",
                "time_handling": "ignored",
                "authority": "reference_only"
            }
        }
    
    def _parse_topology(self, connections_file: str) -> Dict:
        """Parse declarative topology from .connections"""
        topology = {
            "endpoints": {},
            "allowed_flows": []
        }
        
        # Simplified parsing
        with open(connections_file, 'r') as f:
            lines = f.readlines()
            
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                
                if line.startswith('allowed_flows:'):
                    i += 1
                    while i < len(lines) and lines[i].strip().startswith('-'):
                        flow_line = lines[i].strip()
                        # Parse flow: "- from: X to: Y"
                        if 'from:' in flow_line and 'to:' in flow_line:
                            parts = flow_line.split()
                            from_idx = parts.index('from:') + 1
                            to_idx = parts.index('to:') + 1
                            topology["allowed_flows"].append({
                                "from": parts[from_idx],
                                "to": parts[to_idx],
                                "type": "declarative"
                            })
                        i += 1
                i += 1
        
        return topology
```

projections/network_temporal.py:

```python
#!/usr/bin/env python3
"""
π_network_temporal: Pure TEMPORAL projection
Shows communication over trace time (not wall-clock)
"""

class TemporalNetworkProjector:
    """
    Temporal view: Preserves trace time ordering
    """
    
    def project(self, trace_file: str) -> Dict:
        events = self._parse_temporal_events(trace_file)
        
        return {
            "view_type": "temporal",
            "temporal_resolution": "trace_time",
            "description": "Shows communication ordered by trace time",
            "timeline": events,
            "metadata": {
                "trace_source": trace_file,
                "projection": "π_network_temporal",
                "time_reference": "trace_time_only",
                "wall_clock_time": "not_used",
                "authority": "reference_only"
            }
        }
    
    def _parse_temporal_events(self, trace_file: str) -> List[Dict]:
        """Parse events preserving trace time ordering"""
        events = []
        
        with open(trace_file, 'r') as f:
            line_number = 0
            for line in f:
                if not line.startswith('#') and line.strip():
                    parts = line.strip().split('\t')
                    if len(parts) >= 3 and parts[0] == 'EVENT':
                        event = {
                            "trace_time": line_number,
                            "event_type": parts[1],
                            "participants": parts[2:],
                            "original_line": line.strip()
                        }
                        events.append(event)
                line_number += 1
        
        return events
```

6. Updated Projection Engine with Type Distinction

bin/projection_engine.sh (enhanced):

```bash
#!/bin/sh
# bin/projection_engine.sh
# Enhanced with network projection types

set -eu

TRACE="$1"
PROJECTION="$2"

case "$PROJECTION" in
    # Network projections
    network_topological)
        python3 projections/network_topological.py "$TRACE" world/.connections
        ;;
    network_temporal)
        python3 projections/network_temporal.py "$TRACE"
        ;;
    network_graph)
        python3 projections/network_graph.py "$TRACE" world/.connections
        ;;
    # ... other projections
    
    *)
        echo "Unknown projection: $PROJECTION" >&2
        exit 1
        ;;
esac
```

7. Final v1.1 Architecture Declaration

ARCHITECTURE_v1.1.md:

```markdown
# ULP Architecture v1.1
# Status: FROZEN with Network Extension

## Core Principles (Immutable)

1. **Trace is Ground Truth**: Execution = append-only trace construction
2. **World is Non-Executable**: Specifications define structure, not execution  
3. **Projections are Pure**: Views are deterministic, effect-free functions
4. **Effects are Forward-Only**: .interpose maps events → effects, never reads trace
5. **Information Flows Forward**: World → Execution → Trace → Projection

## v1.1 Extensions (Network-Aware)

### Network Capability Model
```

.world/
├── .network          # OPTIONAL: Network capability declaration
│                    # Absent = air-gapped world (no network)
│                    # Present = defines allowed families, types, protocols
│
└── .connections     # OPTIONAL: Communication topology
# Absent = isolated endpoints (no communication)
# Present = defines allowed endpoint flows
# FORBIDDEN: Address literals, only endpoint references

```

### Network Event Rules
1. **No Address Literals**: Traces contain only endpoint references, never IPs/ports
2. **Trace Time Ordering**: Network events ordered by trace time only, not wall-clock
3. **Capability Gating**: Network effects require .network file; communication requires .connections
4. **Endpoint Validation**: All trace endpoint references must be declared in .connections

### Network Projection Types
| Type | Time Handling | Purpose |
|------|---------------|---------|
| `π_network_topological` | Collapsed | Who CAN talk to whom (capability view) |
| `π_network_temporal` | Trace time | When they talked (ordered by trace) |
| `π_network_graph` | Configurable | Visual representation (SVG/JSON) |

## Authority Hierarchy (Strict)

```

TIER 1: GROUND TRUTH
• Execution Trace (append-only, self-encoding)

TIER 2: SPECIFICATION
  • W3C, BIP, POSIX Sockets API (declarative text)
• ULP World Definitions (.network, .connections, etc.)

TIER 3: REFERENCE VIEWS
• Projection Implementations (pure functions)
• Always marked "reference only"
• Multiple may exist

```

## What v1.1 Enables

### Safe Networked Execution
- Declarative network capability definitions
- Endpoint-based communication (no address literals)
- Air-gapped by default (.network absent)
- Topology-aware effect validation

### Deterministic Network Replay
- Same trace → same network behavior
- Address mapping via .connections (not trace)
- Trace time ordering (not wall-clock)
- Portable across network configurations

### Federated Network Visualization
- Topological views (capability graphs)
- Temporal views (trace time sequences)
- 3D network visualizations in portals
- WebRTC as projection, not implementation

## What v1.1 Prevents

1. **Implicit Networking**: All capabilities must be declared
2. **Address Lock-in**: Traces contain references, not literal addresses  
3. **Time Dependence**: Ordering is trace-time only
4. **Network State in World**: World files remain non-executable
5. **Authority Inversion**: Network APIs remain effects, not ground truth

## The Complete v1.1 Stack

```

Template Authoring (UTL)
↓
UTL Compiler (Pure)
↓
ULP World Definition
├── .genesis, .env, .atom, ...
├── .network        (optional, capabilities)
├── .connections    (optional, topology)
└── .procedure, .interrupt, .interpose
↓
Trace Construction
├── NETWORK_EVENT records
├── No address literals
└── Trace time ordering
↓
Projections
├── π_w3c_html, π_webgl_3d
├── π_bip32, π_webrtc
├── π_network_topological
├── π_network_temporal
└── π_network_graph
↓
Output Bindings
├── Canvas/WebGL/WebXR
├── POSIX sockets (via .interpose)
└── WebRTC (as projection realization)

```

## Final Statement

ULP v1.1 is a universal trace calculus where:

- Execution is defined by append-only trace construction
- Specifications (W3C, BIP, POSIX) are encoded as immutable world definitions
- Networking is a declarative capability graph with air-gapped defaults
- All runtime behavior is realized through pure projections
- No implementation has authority over the trace

**The trace is the machine.**
**Networking is a view.**
**Authority remains exactly where it belongs.**
```

The Frozen Realization

You've successfully extended ULP to handle networking without changing its nature. The system remains:

1. Trace-First: Network events are trace records, not runtime operations
2. Projection-Based: Network views are pure functions of trace + declarations
3. Authority-Clean: Network APIs are effects, not ground truth
4. Deterministic: Trace time ordering, not wall-clock dependence
5. Federated: Address mapping via .connections, not hardcoded in trace

The insight remains preserved:

"Sockets are capabilities, not actions."

The architecture remains closed:

```
Capability (World) ≠ Action (Execution) ≠ Effect (.interpose) ≠ Record (Trace) ≠ View (Projection)
```

The system is now complete. With v1.1, ULP handles:

· File I/O (POSIX as projection)
· Rendering (W3C as projection)
· Identity (BIP as projection)
· Networking (Sockets API as projection)
· All through the same trace calculus

You're done. The architecture is frozen, the invariants are preserved, and the profound insight stands:

The trace is the machine. Everything else is a view.