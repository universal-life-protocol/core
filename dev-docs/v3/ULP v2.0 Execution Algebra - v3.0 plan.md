I'll help you integrate the ULP v2.0 Execution Algebra into the existing ulpv2 system as outlined in the specifications. Here's a complete implementation plan:

1. Update Dotfile Specifications

1.1 Add .interface (new dotfile for reverse projections)

```bash
cat > world/.interface << 'EOF'
interface v1
decompile_mode full
outputs:
  - recovered.procedure
  - recovered.interrupt
  - canonical_polynomials.txt
end outputs
end interface
EOF
```

1.2 Update .atom to support weights

```bash
# Update world/.atom to include weights
cat > world/.atom << 'EOF'
atom scope weight 2
atom order weight 1
atom bind weight 1
atom publish weight 3
atom redact weight 2
atom destroy weight 999
EOF
```

1.3 Update .manifest to include weighted degree

```bash
# Update world/.manifest
cat > world/.manifest << 'EOF'
manifest v2

# Global algebra constraints
max_degree 3
max_wdegree 6

# Global safety rules
ban_monomial_prefix destroy
EOF
```

1.4 Add or update .procedure with open mode and weighted degree

```bash
cat > world/.procedure << 'EOF'
procedure chat_pipeline v2
domain:
  +2 scope
  +1 publish
end domain

mode open
sign same
max_wdegree 6
shadow first_atom

end procedure
EOF
```

1.5 Add .interrupt with weighted monomial examples

```bash
cat > world/.interrupt << 'EOF'
interrupt OK_EXTRACT v2
poly:
  +1 scope.order
  +1 bind
end poly
end interrupt

interrupt OVERFLOW_BIND v2
poly:
  +2 bind
end poly
end interrupt

interrupt SIGN_MISMATCH v2
poly:
  -1 publish
end poly
end interrupt

interrupt MANIFEST_BAN v2
poly:
  +1 destroy
end poly
end interrupt

interrupt OPEN_OK v2
poly:
  +1 scope.order.bind
end poly
end interrupt
EOF
```

2. Create bin/poly.awk with Execution Algebra

```awk
#!/usr/bin/awk -f
#
# poly.awk — ULP v2.0 Execution Algebra
# Supports: open-envelope mode, weighted atoms, bidirectional decompile traces
#

BEGIN {
    FS = "[ \t]+"
    PROCNAME = ""
    INTRNAME = ""
    SECTION = ""
    
    # Load all components
    load_atoms(WORLD_DIR "/.atom")
    load_manifest(WORLD_DIR "/.manifest")
    load_interface(WORLD_DIR "/.interface")
    parse_procedure(WORLD_DIR "/.procedure")
    parse_interrupts(WORLD_DIR "/.interrupt")
    
    # Evaluate algebra
    evaluate()
    
    # Emit results
    emit()
}

###############
# Load atoms with weights
###############
function load_atoms(file, line, a) {
    while ((getline line < file) > 0) {
        if (line ~ /^[ \t]*atom[ \t]+/) {
            split(line, a)
            ATOM[a[2]] = 1
            # Parse weight if present
            if (NF >= 4 && a[3] == "weight") {
                ATOM_W[a[2]] = int(a[4])
            } else {
                ATOM_W[a[2]] = 1  # default weight
            }
            emit_trace("ALG_ATOM", a[2] " weight " ATOM_W[a[2]])
        }
    }
    close(file)
}

#################
# Load manifest
#################
function load_manifest(file, line, a) {
    while ((getline line < file) > 0) {
        if (line ~ /^max_degree/) {
            split(line, a)
            MAN_MAX_DEG = a[2]
            emit_trace("ALG_MANIFEST", "max_degree " MAN_MAX_DEG)
        }
        if (line ~ /^max_wdegree/) {
            split(line, a)
            MAN_MAX_WDEG = a[2]
            emit_trace("ALG_MANIFEST", "max_wdegree " MAN_MAX_WDEG)
        }
        if (line ~ /^ban_monomial_prefix/) {
            split(line, a)
            MAN_BAN_PREFIX[a[2]] = 1
            emit_trace("ALG_MANIFEST", "ban_monomial_prefix " a[2])
        }
    }
    close(file)
}

###################
# Load interface (decompile config)
###################
function load_interface(file, line) {
    if (file_exists(file)) {
        INTERFACE_ENABLED = 1
        emit_trace("ALG_INTERFACE", "decompile_enabled")
    }
}

###################
# Parse procedure
###################
function parse_procedure(file, line, a) {
    while ((getline line < file) > 0) {
        if (line ~ /^procedure/) {
            split(line, a)
            PROCNAME = a[2]
            VERSION = a[4]
            emit_trace("ALG_PROC", PROCNAME " version " VERSION)
        }
        
        if (line ~ /^domain:/) {
            SECTION = "DOMAIN"
            continue
        }
        
        if (line ~ /^end domain/) {
            SECTION = ""
            continue
        }
        
        if (line ~ /^mode/) {
            split(line, a)
            PROC_MODE = a[2]
            emit_trace("ALG_PROC", PROCNAME " mode " PROC_MODE)
        }
        
        if (line ~ /^sign/) {
            split(line, a)
            PROC_SIGN = a[2]
            emit_trace("ALG_PROC", PROCNAME " sign " PROC_SIGN)
        }
        
        if (line ~ /^max_wdegree/) {
            split(line, a)
            PROC_MAX_WDEG = a[2]
            emit_trace("ALG_PROC", PROCNAME " max_wdegree " PROC_MAX_WDEG)
        }
        
        if (line ~ /^shadow/) {
            split(line, a)
            PROC_SHADOW = a[2]
            emit_trace("ALG_PROC", PROCNAME " shadow " PROC_SHADOW)
        }
        
        if (SECTION == "DOMAIN" && line ~ /^[+-]/) {
            coef = $1
            mono = $2
            E[mono] += coef
            E_DEG[mono] = monodeg(mono)
            E_WDEG[mono] = monowdeg(mono)
        }
    }
    close(file)
    
    # Emit envelope polynomial
    for (m in E) {
        emit_trace("ALG_PROC_POLY", E[m] " " m)
    }
}

####################
# Parse interrupts
####################
function parse_interrupts(file, line, a) {
    while ((getline line < file) > 0) {
        if (line ~ /^interrupt/) {
            split(line, a)
            INTRNAME = a[2]
            VERSION = a[4]
            emit_trace("ALG_INTR", INTRNAME " version " VERSION)
        }
        
        if (line ~ /^poly:/) {
            SECTION = "POLY"
            continue
        }
        
        if (line ~ /^end poly/) {
            SECTION = ""
            continue
        }
        
        if (SECTION == "POLY" && line ~ /^[+-]/) {
            coef = $1
            mono = $2
            I[INTRNAME, mono] += coef
            I_DEG[INTRNAME] = max(I_DEG[INTRNAME], monodeg(mono))
            I_WDEG[INTRNAME] = max(I_WDEG[INTRNAME], monowdeg(mono))
        }
    }
    close(file)
    
    # Emit interrupt polynomials
    for (k in I) {
        split(k, a, SUBSEP)
        intr = a[1]
        mono = a[2]
        emit_trace("ALG_INTR_POLY", intr " " I[intr, mono] " " mono)
    }
}

###################
# Evaluation
###################
function evaluate(m, cI, cE, a, pfx, shadow_mono) {
    for (k in I) {
        split(k, a, SUBSEP)
        intr = a[1]
        mono = a[2]
        cI = I[intr, mono]
        
        # Atom validity
        split(mono, atoms, ".")
        for (i in atoms) {
            atom = atoms[i]
            if (!(atom in ATOM)) {
                FAIL[intr] = "unknown_atom:" atom
                continue
            }
        }
        
        # Manifest ban
        pfx = atoms[1]
        if (pfx in MAN_BAN_PREFIX) {
            FAIL[intr] = "manifest_ban_prefix:" pfx
            continue
        }
        
        # Degree check
        if (monodeg(mono) > MAN_MAX_DEG) {
            FAIL[intr] = "manifest_degree_exceeded"
            continue
        }
        
        # Weighted degree check
        if (monowdeg(mono) > MAN_MAX_WDEG) {
            FAIL[intr] = "manifest_wdegree_exceeded"
            continue
        }
        
        # Envelope support (open/closed mode)
        if (mono in E) {
            cE = E[mono]
        } else if (PROC_MODE == "open") {
            # Open mode: find shadow
            shadow_mono = compute_shadow(mono)
            if (!(shadow_mono in E)) {
                FAIL[intr] = "open_shadow_missing:" shadow_mono
                continue
            }
            cE = E[shadow_mono]
            emit_trace("ALG_SHADOW", intr " " mono " " shadow_mono)
        } else {
            # Closed mode: monomial must be in envelope
            FAIL[intr] = "envelope_missing_monomial"
            continue
        }
        
        # Coefficient envelope check
        if (abs(cI) > abs(cE)) {
            FAIL[intr] = "envelope_coef_exceeded"
            continue
        }
        
        # Sign check
        if (PROC_SIGN == "same" && (cI * cE < 0)) {
            FAIL[intr] = "envelope_sign_mismatch"
            continue
        }
        
        # Procedure degree checks
        if (PROC_MAX_WDEG && monowdeg(mono) > PROC_MAX_WDEG) {
            FAIL[intr] = "procedure_wdegree_exceeded"
            continue
        }
        
        OK[intr] = 1
    }
}

###################
# Compute shadow (open mode)
###################
function compute_shadow(mono, a) {
    split(mono, a, ".")
    
    if (PROC_SHADOW == "longest_prefix") {
        # Find longest prefix that exists in envelope
        prefix = a[1]
        for (i = 2; i <= length(a); i++) {
            test_prefix = prefix "." a[i]
            if (test_prefix in E) {
                prefix = test_prefix
            } else {
                break
            }
        }
        return prefix
    } else {
        # Default: first_atom
        return a[1]
    }
}

###################
# Emit results
###################
function emit() {
    # Bind decisions
    for (intr in I_DEG) {
        if (OK[intr]) {
            print "BIND", PROCNAME, intr, "ok", 1, "reason ok"
            emit_trace("ALG_BIND", PROCNAME " " intr " ok 1 reason ok")
        } else {
            print "BIND", PROCNAME, intr, "ok", 0, "reason", FAIL[intr]
            emit_trace("ALG_BIND", PROCNAME " " intr " ok 0 reason " FAIL[intr])
        }
    }
    
    # Decompile traces if interface enabled
    if (INTERFACE_ENABLED) {
        emit_decompile()
    }
}

###################
# Emit decompile traces
###################
function emit_decompile() {
    emit_trace("DECOMP_START", PROCNAME)
    
    # Reconstructed procedure
    emit_trace("DECOMP_EMIT_PROC", PROCNAME)
    for (m in E) {
        emit_trace("DECOMP_EMIT_PROC_POLY", E[m] " " m)
    }
    
    # Reconstructed interrupts
    for (intr in I_DEG) {
        emit_trace("DECOMP_EMIT_INTR", intr)
        for (k in I) {
            split(k, a, SUBSEP)
            if (a[1] == intr) {
                emit_trace("DECOMP_EMIT_INTR_POLY", intr " " I[intr, a[2]] " " a[2])
            }
        }
    }
    
    emit_trace("DECOMP_END", PROCNAME)
}

###################
# Helper functions
###################
function monodeg(m) {
    return split(m, a, ".")
}

function monowdeg(m, deg, i) {
    deg = 0
    n = split(m, a, ".")
    for (i = 1; i <= n; i++) {
        deg += ATOM_W[a[i]]
    }
    return deg
}

function abs(x) { 
    return x < 0 ? -x : x 
}

function max(a, b) { 
    return a > b ? a : b 
}

function file_exists(file) {
    return (system("test -f \"" file "\"") == 0)
}

function emit_trace(type, data) {
    print "#ALG", type, data > TRACE_FILE
}
```

3. Update bin/run.sh to integrate algebra

```bash
#!/bin/sh
# bin/run.sh - ULP v2.0 Main Execution Engine

set -eu

# ... existing code ...

# Add algebra evaluation before interrupt execution
echo "#ALG evaluating execution algebra..." >&2

# Run poly.awk to evaluate algebra
WORLD="$1"
OUTDIR="$2"

# Create algebra trace file
ALG_TRACE="$OUTDIR/.ulp/algebra.log"
mkdir -p "$(dirname "$ALG_TRACE")"

# Evaluate algebra
awk -v WORLD_DIR="$WORLD" -v TRACE_FILE="$ALG_TRACE" -f bin/poly.awk > "$OUTDIR/.ulp/poly.plan"

# Parse bind decisions and execute interrupts
awk '$1=="BIND" && $4=="ok" && $5==1 { print $3 }' "$OUTDIR/.ulp/poly.plan" | \
while read intr; do
    echo "#ALG executing interrupt: $intr" >&2
    sh interrupts/"$intr".sh
done

# Merge algebra traces into main trace
if [ -f "$ALG_TRACE" ]; then
    cat "$ALG_TRACE" >> "$OUTDIR/trace.log"
fi

# ... rest of existing code ...
```

4. Add bin/decomp.sh for bidirectional decompilation

```bash
#!/bin/sh
# bin/decomp.sh - Reverse projection / decompilation tool

set -eu

if [ $# -lt 1 ]; then
    echo "Usage: $0 <trace.log> [output_dir]" >&2
    exit 1
fi

TRACE_FILE="$1"
OUTDIR="${2:-decompiled}"

mkdir -p "$OUTDIR"

# Extract algebra traces
echo "=== ULP v2.0 Decompilation ===" >&2
echo "Extracting from: $TRACE_FILE" >&2
echo "Output to: $OUTDIR" >&2

# Parse ALG_* traces and reconstruct
awk '
/^#ALG / {
    type = $2
    data = substr($0, index($0, $3))
    
    if (type == "DECOMP_EMIT_PROC") {
        current_proc = data
        print "procedure " current_proc " v2" > "'"$OUTDIR"'/recovered.procedure"
        print "domain:" >> "'"$OUTDIR"'/recovered.procedure"
    }
    else if (type == "DECOMP_EMIT_PROC_POLY") {
        split(data, parts, " ")
        coef = parts[1]
        mono = parts[2]
        print "  " coef " " mono >> "'"$OUTDIR"'/recovered.procedure"
    }
    else if (type == "DECOMP_EMIT_INTR") {
        current_intr = data
        print "interrupt " current_intr " v2" > "'"$OUTDIR"'/recovered.interrupt"
        print "poly:" >> "'"$OUTDIR"'/recovered.interrupt"
    }
    else if (type == "DECOMP_EMIT_INTR_POLY") {
        split(data, parts, " ")
        intr = parts[1]
        coef = parts[2]
        mono = parts[3]
        if (intr == current_intr) {
            print "  " coef " " mono >> "'"$OUTDIR"'/recovered.interrupt"
        }
    }
}
' "$TRACE_FILE"

# Add closing tags
if [ -f "$OUTDIR/recovered.procedure" ]; then
    echo "end domain" >> "$OUTDIR/recovered.procedure"
    echo "mode open" >> "$OUTDIR/recovered.procedure"
    echo "sign same" >> "$OUTDIR/recovered.procedure"
    echo "max_wdegree 6" >> "$OUTDIR/recovered.procedure"
    echo "shadow first_atom" >> "$OUTDIR/recovered.procedure"
    echo "end procedure" >> "$OUTDIR/recovered.procedure"
fi

if [ -f "$OUTDIR/recovered.interrupt" ]; then
    echo "end poly" >> "$OUTDIR/recovered.interrupt"
    echo "end interrupt" >> "$OUTDIR/recovered.interrupt"
fi

echo "=== Decompilation Complete ===" >&2
echo "Files created:" >&2
ls -la "$OUTDIR/" 2>/dev/null | grep -v '^total' || true
```

5. Update .symmetry to include algebra policy

```bash
cat > world/.symmetry << 'EOF'
symmetry v2
policy e8xe8
projective C
causality H
incidence O
replicas 9
algebra:
  mode open
  weighted_atoms yes
  decompile_traces yes
end algebra
end symmetry
EOF
```

6. Update Directory Structure

```
ulpv2/
├── bin/
│   ├── poly.awk          # NEW: Execution algebra evaluator
│   ├── decomp.sh         # NEW: Bidirectional decompilation
│   ├── run.sh           # UPDATED: Integrates algebra
│   ├── hash.sh
│   ├── canon.sh
│   ├── policy.sh
│   ├── geometry.sh
│   ├── replica.sh
│   └── proc.awk
├── interrupts/
├── world/
│   ├── .genesis
│   ├── .env
│   ├── .schema
│   ├── .atom           # UPDATED: Now includes weights
│   ├── .manifest       # UPDATED: Now includes max_wdegree
│   ├── .sequence
│   ├── .include
│   ├── .ignore
│   ├── .interrupt      # UPDATED: Now uses polynomial syntax
│   ├── .procedure      # UPDATED: Now has open mode + weighted degree
│   ├── .view
│   ├── .record
│   ├── .symmetry       # UPDATED: Now includes algebra policy
│   └── .interface      # NEW: Decompilation configuration
└── README.md
```

7. Test Script

```bash
#!/bin/sh
# test_algebra.sh - Test Execution Algebra

set -eu

echo "=== Testing ULP v2.0 Execution Algebra ==="

# 1. Test basic algebra evaluation
echo -e "hello\nworld" | ./bin/run.sh world out_algebra 2>&1 | grep -E "(ALG|BIND)"

# 2. Check algebra traces
echo -e "\n=== Algebra Traces ==="
grep "^#ALG" out_algebra/trace.log

# 3. Test decompilation
echo -e "\n=== Decompilation Test ==="
./bin/decomp.sh out_algebra/trace.log decompiled

# 4. Verify recovered files
echo -e "\n=== Recovered Files ==="
ls -la decompiled/

# 5. Verify algebra results
echo -e "\n=== Algebra Evaluation Results ==="
cat out_algebra/.ulp/poly.plan

echo -e "\n=== Test Complete ==="
```

Key Features Added:

1. Open-Envelope Mode: Interrupts can introduce new monomials not explicitly listed in the procedure envelope
2. Weighted Atoms: Atoms now have weights for weighted degree calculations
3. Bidirectional Decompile Traces: Reverse projection from traces to reconstruct algebraic artifacts
4. New .interface Dotfile: Configuration for decompilation outputs
5. Algebra-Aware Execution: run.sh now evaluates algebra before executing interrupts
6. Decompilation Tool: decomp.sh reconstructs procedure and interrupt files from traces

The implementation maintains all ULP v2.0 invariants while adding the algebraic execution layer as specified in the documentation.