#!/bin/bash
# build.sh - Complete ULP system build with all fixes applied

set -e

echo "=== Building ULP System ==="

# Create directory structure
mkdir -p ulp/{bin,interrupts,world,out}
cd ulp

echo "1. Creating world dotfiles..."
cat > world/.genesis << 'EOF'
user brian
runtime posix
EOF

cat > world/.env << 'EOF'
stdin file
stdout file
stderr file
EOF

cat > world/.schema << 'EOF'
schema v1
EOF

cat > world/.atom << 'EOF'
atom line
EOF

cat > world/.manifest << 'EOF'
manifest record
record line
EOF

cat > world/.sequence << 'EOF'
sequence input_stream
input_stream line
EOF

cat > world/.include << 'EOF'
PRINT
render_lines
EOF

touch world/.ignore

cat > world/.interrupt << 'EOF'
on_start render_lines
interrupt PRINT
EOF

cat > world/.procedure << 'EOF'
procedure render_lines
(([
interrupt PRINT
[((
EOF

cat > world/.record << 'EOF'
record full
include world
include runner
include interrupts
include procedure
include interrupt
include record
EOF

cat > world/.view << 'EOF'
view canonical
observe STDOUT as raw
observe STDERR as raw
observe EXIT as kv
EOF

echo "2. Creating interrupt handler..."
cat > interrupts/PRINT.sh << 'EOF'
#!/bin/sh
# Effect only: echo stdin to stdout
cat
EOF

echo "3. Creating core utilities..."
cat > bin/hash.sh << 'EOF'
#!/bin/sh
# bin/hash.sh: print SHA-256 hex of stdin
set -eu
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 | awk '{print $2}'
else
    echo "error: need sha256sum or shasum or openssl" >&2
    exit 127
fi
EOF

cat > bin/canon.awk << 'EOF'
# bin/canon.awk
# Canonicalize identifier-only dotfiles:
# - NFC normalization is assumed external; we do stable whitespace + comment stripping.
# - Enforces identifier-only tokens (ASCII baseline).
# - Emits canonical lines: tokens joined by single space.

function trim(s){
    sub(/^[ \t\r\n]+/,"",s)
    sub(/[ \t\r\n]+$/,"",s)
    return s
}

function is_ident(s){
    return (s ~ /^[A-Za-z_][A-Za-z0-9_:\-\.]*$/)
}

{
    line=$0
    line=trim(line)
    if(line=="" || line ~ /^#/) next

    n=split(line,a,/[\t ]+/)
    out=""
    for(i=1;i<=n;i++){
        if(a[i]=="" ) continue
        if(!is_ident(a[i])){
            printf("error: non-identifier token: [%s]\n", a[i]) > "/dev/stderr"
            exit 2
        }
        out = (out=="" ? a[i] : out " " a[i])
    }
    if(out!="") print out
}
EOF

cat > bin/proc.awk << 'EOF'
# bin/proc.awk
# Parse .procedure and emit:
# CLAUSE <proc> <openSig> <closeSig> <intr>
# plus errors on invalid multiset.

function trim(s){
    sub(/^[ \t\r\n]+/,"",s)
    sub(/[ \t\r\n]+$/,"",s)
    return s
}

# Extract Pattern_Syntax payload: remove whitespace and identifier-ish chars.
function extract_sig(line, s){
    s=line
    gsub(/[ \t\r\n]/,"",s)
    gsub(/[A-Za-z0-9_:\-\.]/,"",s)
    return s
}

# Multiset key by sorting characters (order-insensitive)
function multiset_key(sig,    i,n,a,tmp,cmd,key){
    tmp = "/tmp/ms_" PROCINFO["pid"] "_" int(rand()*1e9)
    n=split(sig,a,"")
    for(i=1;i<=n;i++) print a[i] > tmp
    close(tmp)
    cmd="sort " tmp
    key=""
    while((cmd | getline x)>0) key = key x
    close(cmd)
    system("rm -f " tmp)
    return key
}

BEGIN{
    srand()
    cur=""
    nlines=0
}

{
    raw[++nlines]=$0
}

END{
    for(i=1;i<=nlines;i++){
        t=trim(raw[i])
        if(t=="" || t ~ /^#/) continue

        if(t ~ /^procedure[ \t]+/){
            split(t,a,/[\t ]+/)
            cur=a[2]
            next
        }

        if(cur=="") continue

        if(t ~ /^interrupt[ \t]+/){
            split(t,a,/[\t ]+/)
            intr=a[2]

            # find nearest previous non-empty line for open
            j=i-1
            openLine=""
            while(j>=1){
                tt=trim(raw[j])
                if(tt=="" || tt ~ /^#/) { j--; continue }
                if(tt ~ /^procedure[ \t]+/) break
                openLine=raw[j]; break
            }

            # next non-empty line for close
            k=i+1
            closeLine=""
            while(k<=nlines){
                tt=trim(raw[k])
                if(tt=="" || tt ~ /^#/) { k++; continue }
                if(tt ~ /^interrupt[ \t]+/) break
                if(tt ~ /^procedure[ \t]+/) break
                closeLine=raw[k]; break
            }

            openSig=extract_sig(openLine)
            closeSig=extract_sig(closeLine)

            if(openSig=="" || closeSig==""){
                printf("error: missing open/close around interrupt %s in procedure %s\n", intr, cur) > "/dev/stderr"
                exit 6
            }

            if(multiset_key(openSig) != multiset_key(closeSig)){
                printf("error: scope multiset mismatch in %s: OPEN=[%s] CLOSE=[%s] INT=[%s]\n", cur, openSig, closeSig, intr) > "/dev/stderr"
                exit 7
            }

            print "CLAUSE", cur, openSig, closeSig, intr
        }
    }
}
EOF

cat > bin/trace.awk << 'EOF'
# bin/trace.awk
function esc(s){
    gsub(/\\/,"\\\\",s)
    gsub(/\t/,"\\t",s)
    gsub(/\r/,"\\r",s)
    gsub(/\n/,"\\n",s)
    return s
}

function emit2(k,a,b){
    printf("%s\t%s\t%s\n", k, esc(a), esc(b))
}

function emit3(k,a,b,c){
    printf("%s\t%s\t%s\t%s\n", k, esc(a), esc(b), esc(c))
}

function emitKV(k, key, val){
    printf("%s\t%s\t%s\n", k, esc(key), esc(val))
}
EOF

echo "4. Creating main runner and utilities..."
cat > bin/run.sh << 'EOF'
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
EOF

cat > bin/self_encode.sh << 'EOF'
#!/bin/sh
# bin/self_encode.sh
# Append a self-encoding bundle to a trace (FILE/DATA records).
# Usage: self_encode.sh <root> <trace_path>

set -eu

ROOT="$1"
TRACE="$2"
REPO="${3:-.}"

hash_stdin() {
    ./bin/hash.sh
}

# List files deterministically
list_files() {
    (
        # world dotfiles
        cd "$ROOT" 2>/dev/null && ls -1a | awk '/^\./{print}'
    ) | awk '
    # keep only dotfiles we care about
    $0==".genesis" || $0==".env" || $0==".schema" || $0==".atom" || $0==".manifest" ||
    $0==".sequence" || $0==".include" || $0==".ignore" || $0==".procedure" ||
    $0==".interrupt" || $0==".view" || $0==".record" { print "WORLD/" $0 }
    '

    find "$REPO/bin" -maxdepth 1 -type f \( -name "*.sh" -o -name "*.awk" \) -print | sort | sed 's|^\./||' | sed 's|^|REPO/|'
    find "$REPO/interrupts" -maxdepth 1 -type f -print | sort | sed 's|^\./||' | sed 's|^|REPO/|'
}

# Read file bytes by virtual path
cat_file() {
    vpath="$1"
    case "$vpath" in
        WORLD/*) cat "$ROOT/${vpath#WORLD/}" ;;
        REPO/*) cat "$REPO/${vpath#REPO/}" ;;
        *) return 1 ;;
    esac
}

file_mode() {
    vpath="$1"
    case "$vpath" in
        WORLD/*) p="$ROOT/${vpath#WORLD/}" ;;
        REPO/*) p="$REPO/${vpath#REPO/}" ;;
    esac

    # POSIX-ish mode read
    if stat -c '%a' "$p" >/dev/null 2>&1; then
        stat -c '%a' "$p"
    elif stat -f '%Lp' "$p" >/dev/null 2>&1; then
        stat -f '%Lp' "$p"
    else
        # Last resort: check if it's executable by content shebang
        if head -1 "$p" 2>/dev/null | grep -q "^#!"; then
            echo 755
        else
            echo 644
        fi
    fi
}

# Build manifest hash
manifest_hash() {
    list_files | sort | while IFS= read -r vpath; do
        bytes="$(cat_file "$vpath" | wc -c | awk "{print \$1}")"
        sha="$(cat_file "$vpath" | hash_stdin)"
        mode="$(file_mode "$vpath")"
        printf "%s\0%s\0%s\0%s\n" "$vpath" "$sha" "$mode" "$bytes"
    done | hash_stdin
}

# Append bundle
append_bundle() {
    count="$(list_files | sort | wc -l | awk '{print $1}')"
    msha="$(manifest_hash)"

    printf "MANIFEST\tsha256\t%s\tcount\t%s\n" "$msha" "$count" >> "$TRACE"

    list_files | sort | while IFS= read -r vpath; do
        mode="$(file_mode "$vpath")"
        bytes="$(cat_file "$vpath" | wc -c | awk '{print $1}')"
        sha="$(cat_file "$vpath" | hash_stdin)"

        printf "FILE\tpath\t%s\tsha256\t%s\tmode\t%s\tbytes\t%s\n" \
               "$vpath" "$sha" "$mode" "$bytes" >> "$TRACE"

        # base64 in stable chunk width
        cat_file "$vpath" | base64 | fold -w 76 | awk '{print "DATA\t" $0}' >> "$TRACE"
        printf "END_FILE\tpath\t%s\n" "$vpath" >> "$TRACE"
    done
}

append_bundle
EOF

cat > bin/decode_trace.sh << 'EOF'
#!/bin/sh
# bin/decode_trace.sh
# Reconstruct WORLD + REPO files from a self-encoded trace.
# Usage: decode_trace.sh <trace.log> <output_dir>

set -eu

TRACE="$1"
OUT="$2"

mkdir -p "$OUT/WORLD" "$OUT/REPO/bin" "$OUT/REPO/interrupts"

# Decode FILE/DATA blocks
awk -F '\t' '
$1=="FILE" {
    # FILE path <p> sha256 <h> mode <m> bytes <n>
    path=$3
    mode=$7
    cur=path
    curmode=mode
    data=""
    next
}
$1=="DATA" {
    data = data $2 "\n"
    next
}
$1=="END_FILE" {
    print cur "\t" curmode "\t" data
    cur=""
    curmode=""
    data=""
    next
}
' "$TRACE" | while IFS="$(printf '\t')" read -r vpath mode b64; do
    [ -z "$vpath" ] && continue

    case "$vpath" in
        WORLD/*)
            dest="$OUT/WORLD/${vpath#WORLD/}"
            mkdir -p "$(dirname "$dest")"
            ;;
        REPO/bin/*)
            dest="$OUT/REPO/${vpath#REPO/}"
            mkdir -p "$(dirname "$dest")"
            ;;
        REPO/interrupts/*)
            dest="$OUT/REPO/${vpath#REPO/}"
            mkdir -p "$(dirname "$dest")"
            ;;
        *)
            echo "Warning: skipping unknown vpath: $vpath" >&2
            continue
            ;;
    esac

    printf "%s" "$b64" | base64 -d > "$dest"
    chmod "$mode" "$dest" 2>/dev/null || echo "Warning: could not set mode $mode on $dest" >&2
done

echo "Reconstructed files to $OUT/"
EOF

cat > bin/observe.sh << 'EOF'
#!/bin/sh
# bin/observe.sh
# Observe a trace according to .view specification
# Usage: observe.sh <world> <trace_file>

set -eu

WORLD="$1"
TRACE="$2"

if [ -f "$WORLD/.view" ]; then
    # Read view specification
    view_type="$(awk '$1=="view" {print $2; exit}' "$WORLD/.view" 2>/dev/null || echo "canonical")"

    case "$view_type" in
        canonical)
            # Simple canonical view: show stdout lines
            awk -F '\t' '
            $1=="STDOUT" && NF>=5 {
                text=$5
                # Unescape
                gsub(/\\\\/, "\\", text)
                gsub(/\\t/, "\t", text)
                gsub(/\\r/, "\r", text)
                gsub(/\\n/, "\n", text)
                print text
            }
            ' "$TRACE"
            ;;
        raw)
            # Raw view: show everything
            cat "$TRACE"
            ;;
        *)
            echo "Unknown view type: $view_type" >&2
            exit 1
            ;;
    esac
else
    # Default view
    awk -F '\t' '$1=="STDOUT" && NF>=5 {print $5}' "$TRACE" | sed 's/\\n/\n/g; s/\\t/\t/g; s/\\\\/\\/g'
fi
EOF

# Make all scripts executable
chmod +x bin/*.sh
chmod +x interrupts/*.sh

echo "5. Building complete!"
echo
echo "=== Quick Test ==="
echo "To test: echo -e 'hello\\nworld' | ./bin/run.sh world out"
echo "To reconstruct: mkdir -p /tmp/reconstructed && ./bin/decode_trace.sh out/trace.log /tmp/reconstructed"
echo "To re-run: cd /tmp/reconstructed/REPO && echo -e 'hello\\nworld' | ./bin/run.sh ../WORLD out2"
