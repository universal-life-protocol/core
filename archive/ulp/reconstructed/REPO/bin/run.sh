#!/bin/sh
# bin/run.sh (hardened)
set -eu

ROOT="${1:-demo}"
OUTDIR="${2:-out}"
ENTRY_PROC="${3:-}"

need() {
    [ -f "$ROOT/$1" ] || { echo "missing $ROOT/$1" >&2; exit 2; };
}

need ".procedure"
need ".interrupt"

command -v awk >/dev/null 2>&1 || { echo "need awk" >&2; exit 127; }
command -v sort >/dev/null 2>&1 || { echo "need sort" >&2; exit 127; }
command -v base64 >/dev/null 2>&1 || { echo "need base64" >&2; exit 127; }
[ -x bin/hash.sh ] || { echo "missing bin/hash.sh" >&2; exit 127; }

mkdir -p "$OUTDIR"

LOCKDIR="$OUTDIR/.lock"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
    echo "error: another run is in progress (lock: $LOCKDIR)" >&2
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
    ENTRY_PROC="$(awk '$1=="on_start" && NF>=2 {print $2; exit}' "$ROOT/.interrupt" || true)"
fi
[ -n "$ENTRY_PROC" ] || { echo "missing entry proc: pass arg or set .interrupt: on_start <proc>" >&2; exit 3; }

allowed_name() {
    name="$1"
    if [ -s "$ROOT/.include" ]; then
        awk -v n="$name" '$1==n{ok=1} END{exit ok?0:1}' "$ROOT/.include" || return 1
    fi
    if [ -f "$ROOT/.ignore" ]; then
        awk -v n="$name" '$1==n{bad=1} END{exit bad?0:1}' "$ROOT/.ignore" && return 1
    fi
    return 0
}

# 1) Validate identifier-only dotfiles (Pattern_Syntax forbidden there by construction)
for f in .genesis .env .schema .atom .manifest .sequence .include .ignore .interrupt .view .record; do
    if [ -f "$ROOT/$f" ]; then
        awk -f bin/canon.awk "$ROOT/$f" >/dev/null
    fi
done

# 2) Compute WID = hash(canonicalized world files)
world_stream() {
    for f in .genesis .env .schema .atom .manifest .sequence .include .ignore .interrupt .view .record; do
        if [ -f "$ROOT/$f" ]; then
            printf 'FILE %s\n' "$f"
            awk -f bin/canon.awk "$ROOT/$f"
        else
            printf 'FILE %s\n' "$f"
            printf 'MISSING\n'
        fi
    done
}

WID="$(world_stream | bin/hash.sh)"

# 3) Emit header
{
    echo "HDR	version	1"
    echo "HDR	entry	$ENTRY_PROC"
    echo "WORLD	wid	$WID"
} >> "$TRACE_TMP"

# 4) Parse .procedure clauses (validates multiset(Open)==multiset(Close))
CLAUSES="$TMPDIR/clauses.tsv"
awk -f bin/proc.awk "$ROOT/.procedure" > "$CLAUSES"

# 5) Execute only clauses belonging to ENTRY_PROC
STDIN_FILE="$TMPDIR/stdin.txt"
cat > "$STDIN_FILE"

# Trace stdin lines once - FIXED: use clean field structure
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

# 6) Run each interrupt clause inside ENTRY_PROC
while IFS=' ' read -r TAG PROC OPEN CLOSE INTR; do
    [ "$TAG" = "CLAUSE" ] || continue
    [ "$PROC" = "$ENTRY_PROC" ] || continue

    allowed_name "$INTR" || { echo "blocked by include/ignore: $INTR" >&2; exit 8; }

    HANDLER="interrupts/$INTR.sh"
    [ -x "$HANDLER" ] || { echo "missing interrupt handler: $HANDLER" >&2; exit 10; }

    # QID includes order (meaning), not multiset (shape)
    QID="$(printf '%s' "Q|OPEN=$OPEN|INT=$INTR|CLOSE=$CLOSE" | bin/hash.sh)"
    EID="$(printf '%s' "E|W=$WID|Q=$QID|INT=$INTR" | bin/hash.sh)"

    {
        printf "CLAUSE\tqid\t%s\topenSig\t%s\tcloseSig\t%s\tintr\t%s\n" "$QID" "$OPEN" "$CLOSE" "$INTR"
        printf "EXEC\teid\t%s\twid\t%s\tqid\t%s\tintr\t%s\n" "$EID" "$WID" "$QID" "$INTR"
    } >> "$TRACE_TMP"

    STDOUT_FILE="$TMPDIR/stdout.$INTR.txt"
    STDERR_FILE="$TMPDIR/stderr.$INTR.txt"
    : > "$STDOUT_FILE"
    : > "$STDERR_FILE"

    RC=0
    ( "$HANDLER" ) < "$STDIN_FILE" > "$STDOUT_FILE" 2> "$STDERR_FILE" || RC=$?

    # Trace stdout/stderr lines - FIXED: use clean field structure
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
done < "$CLAUSES"

echo "END	ok	1" >> "$TRACE_TMP"

# 7) Append self-encoding bundle
./bin/self_encode.sh "$ROOT" "$TRACE_TMP"

# 8) Atomic publish
mv "$TRACE_TMP" "$TRACE"
echo "wrote $TRACE"
