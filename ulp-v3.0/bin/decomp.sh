#!/bin/sh
# bin/decomp.sh - Reverse projection / decompilation tool
set -eu

if [ $# -lt 1 ]; then
    echo "Usage: $0 <trace.log> [output_dir] [--verify]" >&2
    exit 1
fi

TRACE_FILE="$1"
OUTDIR="${2:-decompiled}"
VERIFY=0

if [ "${3:-}" = "--verify" ]; then
    VERIFY=1
fi

mkdir -p "$OUTDIR"

echo "=== ULP v3.0 Decompilation ===" >&2
echo "Source: $TRACE_FILE" >&2
echo "Output: $OUTDIR" >&2

awk -v OUTDIR="$OUTDIR" '
BEGIN {
    in_decomp = 0
    proc_open = 0
    intr_open = 0
    PROC_MODE = "closed"
    PROC_SIGN = "same"
    PROC_WDEG = ""
    PROC_SHADOW = "first_atom"
}

$1 == "#ALG" && $2 == "ALG_PROC" && $4 == "mode" {
    PROC_MODE = $5
}
$1 == "#ALG" && $2 == "ALG_PROC" && $4 == "sign" {
    PROC_SIGN = $5
}
$1 == "#ALG" && $2 == "ALG_PROC" && $4 == "max_wdegree" {
    PROC_WDEG = $5
}
$1 == "#ALG" && $2 == "ALG_PROC" && $4 == "shadow" {
    PROC_SHADOW = $5
}

$1 == "#ALG" && $2 == "DECOMP_START" {
    in_decomp = 1
    next
}
$1 == "#ALG" && $2 == "DECOMP_END" {
    in_decomp = 0
    next
}

$1 == "#ALG" && $2 == "DECOMP_EMIT_PROC" && in_decomp {
    current_proc = $3
    proc_file = OUTDIR "/recovered.procedure"
    print "procedure " current_proc " v2" > proc_file
    print "domain:" >> proc_file
    proc_open = 1
    next
}
$1 == "#ALG" && $2 == "DECOMP_EMIT_PROC_POLY" && in_decomp {
    proc_file = OUTDIR "/recovered.procedure"
    print "  " $3 " " $4 >> proc_file
    next
}

$1 == "#ALG" && $2 == "DECOMP_EMIT_INTR" && in_decomp {
    current_intr = $3
    intr_file = OUTDIR "/recovered.interrupt"
    if (!intr_open) {
        print "" > intr_file
    } else {
        print "end poly" >> intr_file
        print "end interrupt" >> intr_file
    }
    print "interrupt " current_intr " v2" >> intr_file
    print "poly:" >> intr_file
    intr_open = 1
    next
}
$1 == "#ALG" && $2 == "DECOMP_EMIT_INTR_POLY" && in_decomp && $3 == current_intr {
    intr_file = OUTDIR "/recovered.interrupt"
    print "  " $4 " " $5 >> intr_file
    next
}

END {
    if (proc_open) {
        proc_file = OUTDIR "/recovered.procedure"
        print "end domain" >> proc_file
        print "mode " PROC_MODE >> proc_file
        print "sign " PROC_SIGN >> proc_file
        if (PROC_WDEG != "") {
            print "max_wdegree " PROC_WDEG >> proc_file
        }
        print "shadow " PROC_SHADOW >> proc_file
        print "end procedure" >> proc_file
    }
    if (intr_open) {
        intr_file = OUTDIR "/recovered.interrupt"
        print "end poly" >> intr_file
        print "end interrupt" >> intr_file
    }
}
' "$TRACE_FILE"

if [ "$VERIFY" = "1" ] && [ -f "$OUTDIR/recovered.procedure" ]; then
    if grep -q "^  [+-]" "$OUTDIR/recovered.procedure"; then
        echo "✓ Procedure has polynomial terms" >&2
    else
        echo "✗ Procedure missing polynomial terms" >&2
    fi

    if [ -f "$OUTDIR/recovered.interrupt" ]; then
        if grep -q "^interrupt " "$OUTDIR/recovered.interrupt"; then
            echo "✓ Interrupt blocks recovered" >&2
        else
            echo "✗ Interrupt blocks missing" >&2
        fi
    fi
fi

echo "=== Decompilation Complete ===" >&2
