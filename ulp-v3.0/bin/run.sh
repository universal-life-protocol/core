#!/bin/sh
# bin/run.sh - ULP v3.0 execution engine
# (BALL + input) → execute once → POINT
set -eu

WORLD="${1:?missing world directory}"
OUTDIR="${2:?missing output directory}"
ENTRY_PROC="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Required dotfiles (v3.0)
REQUIRED=".genesis .env .schema .atom .manifest .sequence .include .ignore .interrupt .procedure .view .record .symmetry"

# Check required files
for f in $REQUIRED; do
    [ -f "$WORLD/$f" ] || { echo "error: missing required dotfile: $WORLD/$f" >&2; exit 2; }
done

# Check dependencies
command -v awk >/dev/null 2>&1 || { echo "error: need awk" >&2; exit 127; }
command -v base64 >/dev/null 2>&1 || { echo "error: need base64" >&2; exit 127; }
[ -x "$SCRIPT_DIR/hash.sh" ] || { echo "error: missing hash.sh" >&2; exit 127; }

mkdir -p "$OUTDIR"

# Lock to prevent concurrent execution
LOCKDIR="$OUTDIR/.lock"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
    echo "error: execution in progress (lock: $LOCKDIR)" >&2
    exit 9
fi

TMPDIR="$OUTDIR/.tmp.$$"
TRACE_TMP="$TMPDIR/trace.log"
TRACE="$OUTDIR/trace.log"

cleanup() {
    rm -rf "$TMPDIR" >/dev/null 2>&1 || true
    rmdir "$LOCKDIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$TMPDIR"
: > "$TRACE_TMP"

# Resolve entry procedure
if [ -z "$ENTRY_PROC" ]; then
    ENTRY_PROC="$(awk '$1=="on_start" && NF>=2 {print $2; exit}' "$WORLD/.interrupt" || true)"
    if [ -z "$ENTRY_PROC" ]; then
        ENTRY_PROC="$(awk '$1=="procedure" && NF>=2 {print $2; exit}' "$WORLD/.procedure" || true)"
    fi
fi
[ -n "$ENTRY_PROC" ] || { echo "error: no entry procedure (use .interrupt on_start or pass argument)" >&2; exit 3; }

# Validate interrupt name against include/ignore lists
allowed_name() {
    name="$1"
    if [ -s "$WORLD/.include" ]; then
        awk -v n="$name" '$1==n{ok=1} END{exit ok?0:1}' "$WORLD/.include" || return 1
    fi
    if [ -s "$WORLD/.ignore" ]; then
        awk -v n="$name" '$1==n{bad=1} END{exit bad?1:0}' "$WORLD/.ignore" || return 1
    fi
    return 0
}

# === STEP 1: Compute BALL (WID) ===
echo "# Computing WID..." >&2
WID=$("$SCRIPT_DIR/canon.sh" "$WORLD")
echo "# WID: $WID" >&2

# === STEP 2: Emit trace header ===
{
    echo "HDR	version	3"
    echo "HDR	entry	$ENTRY_PROC"
    echo "BALL	wid	$WID"
} >> "$TRACE_TMP"

# === STEP 3: Evaluate execution algebra ===
ALG_DIR="$OUTDIR/.ulp"
ALG_TRACE="$ALG_DIR/algebra.log"
ALG_PLAN="$ALG_DIR/poly.plan"
mkdir -p "$ALG_DIR"
: > "$ALG_TRACE"
awk -v WORLD_DIR="$WORLD" -v TRACE_FILE="$ALG_TRACE" -f "$SCRIPT_DIR/poly.awk" > "$ALG_PLAN"
[ -s "$ALG_PLAN" ] || { echo "error: algebra evaluation failed" >&2; exit 4; }

# Append algebra traces to main trace (deterministic order)
if [ -s "$ALG_TRACE" ]; then
    cat "$ALG_TRACE" >> "$TRACE_TMP"
fi

# === STEP 4: Capture stdin ===
STDIN_FILE="$TMPDIR/stdin.txt"
cat > "$STDIN_FILE"

# Trace stdin lines
awk -v outfile="$TRACE_TMP" '
function esc(s){
    gsub(/\\/,"\\\\",s)
    gsub(/\t/,"\\t",s)
    gsub(/\r/,"\\r",s)
    gsub(/\n/,"\\n",s)
    return s
}
{
    printf("STDIN\tn\t%s\ttext\t%s\n", NR, esc($0)) >> outfile
    close(outfile)
}
' "$STDIN_FILE"

# === STEP 5: Execute admissible interrupts (execution happens ONCE) ===
EXEC_LIST="$TMPDIR/executable_interrupts.txt"
awk -v entry="$ENTRY_PROC" '$1=="BIND" && $2==entry && $4=="ok" && $5==1 {print $3}' "$ALG_PLAN" > "$EXEC_LIST"

while IFS= read -r INTR; do
    [ -n "$INTR" ] || continue

    allowed_name "$INTR" || { echo "error: interrupt blocked: $INTR" >&2; exit 8; }

    HANDLER="interrupts/$INTR.sh"
    [ -x "$HANDLER" ] || { echo "error: missing handler: $HANDLER" >&2; exit 10; }

    # Compute identifiers
    QID="$(printf '%s' "Q|INT=$INTR" | "$SCRIPT_DIR/hash.sh")"
    EID="$(printf '%s' "E|W=$WID|Q=$QID|INT=$INTR" | "$SCRIPT_DIR/hash.sh")"

    {
        printf "CLAUSE\tqid\t%s\tintr\t%s\n" "$QID" "$INTR"
        printf "EXEC\teid\t%s\twid\t%s\tqid\t%s\tintr\t%s\n" "$EID" "$WID" "$QID" "$INTR"
    } >> "$TRACE_TMP"

    STDOUT_FILE="$TMPDIR/stdout.$INTR.txt"
    STDERR_FILE="$TMPDIR/stderr.$INTR.txt"
    : > "$STDOUT_FILE"
    : > "$STDERR_FILE"

    RC=0
    ( "$HANDLER" ) < "$STDIN_FILE" > "$STDOUT_FILE" 2> "$STDERR_FILE" || RC=$?

    # Trace stdout
    awk -v outfile="$TRACE_TMP" '
    function esc(s){
        gsub(/\\/,"\\\\",s)
        gsub(/\t/,"\\t",s)
        gsub(/\r/,"\\r",s)
        gsub(/\n/,"\\n",s)
        return s
    }
    {
        printf("STDOUT\tn\t%s\ttext\t%s\n", NR, esc($0)) >> outfile
        close(outfile)
    }
    ' "$STDOUT_FILE"

    # Trace stderr
    awk -v outfile="$TRACE_TMP" '
    function esc(s){
        gsub(/\\/,"\\\\",s)
        gsub(/\t/,"\\t",s)
        gsub(/\r/,"\\r",s)
        gsub(/\n/,"\\n",s)
        return s
    }
    {
        printf("STDERR\tn\t%s\ttext\t%s\n", NR, esc($0)) >> outfile
        close(outfile)
    }
    ' "$STDERR_FILE"

    printf "EXIT\tintr\t%s\tcode\t%s\n" "$INTR" "$RC" >> "$TRACE_TMP"
done < "$EXEC_LIST"

echo "END	ok	1" >> "$TRACE_TMP"

# === STEP 6: Compute POINT (RID) from trace ===
RID=$("$SCRIPT_DIR/hash.sh" < "$TRACE_TMP")
echo "# RID: $RID" >&2

# === STEP 7: Derive E8×E8 policy (v2.0 feature) ===
echo "# Deriving policy..." >&2

# Derive seeds, chirality
POLICY_JSON=$("$SCRIPT_DIR/policy.sh" "$RID")
E8L=$(echo "$POLICY_JSON" | grep -o '"E8L": "[^"]*"' | cut -d'"' -f4)
E8R=$(echo "$POLICY_JSON" | grep -o '"E8R": "[^"]*"' | cut -d'"' -f4)
CHIRALITY=$(echo "$POLICY_JSON" | grep -o '"chirality": "[^"]*"' | cut -d'"' -f4)

# Derive geometry
GEOMETRY_JSON=$("$SCRIPT_DIR/geometry.sh" "$E8L" "$E8R")
PROJECTIVE=$(echo "$GEOMETRY_JSON" | grep -o '"projective": "[^"]*"' | cut -d'"' -f4)
CAUSALITY=$(echo "$GEOMETRY_JSON" | grep -o '"causality": "[^"]*"' | cut -d'"' -f4)
INCIDENCE=$(echo "$GEOMETRY_JSON" | grep -o '"incidence": "[^"]*"' | cut -d'"' -f4)
INC_SIZE=$(echo "$GEOMETRY_JSON" | grep -o '"incidence_size": [0-9]*' | awk '{print $2}')

# Derive replica slots
REPLICA_JSON=$("$SCRIPT_DIR/replica.sh" "$E8L" "$E8R" "$INC_SIZE")
SLOTS=$(echo "$REPLICA_JSON" | grep -o '"slots": \[[^]]*\]' | cut -d':' -f2-)

# Append policy metadata to trace (v2.0)
{
    echo "#METADATA	policy	v3"
    echo "POLICY	rid	$RID"
    echo "POLICY	e8l	$E8L"
    echo "POLICY	e8r	$E8R"
    echo "POLICY	chirality	$CHIRALITY"
    echo "GEOMETRY	projective	$PROJECTIVE"
    echo "GEOMETRY	causality	$CAUSALITY"
    echo "GEOMETRY	incidence	$INCIDENCE"
    echo "REPLICA	slots	$SLOTS"
} >> "$TRACE_TMP"

# === STEP 8: Append self-encoding bundle ===
"$SCRIPT_DIR/self_encode.sh" "$WORLD" "$TRACE_TMP"

# === STEP 9: Atomic publish ===
mv "$TRACE_TMP" "$TRACE"
echo "# Trace written: $TRACE" >&2
echo "$RID"  # Output RID to stdout for scripting
