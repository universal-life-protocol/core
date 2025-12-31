#!/bin/sh
# bin/decode_trace.sh - Trace reconstruction
# ULP v1.1 - Extracts WORLD and REPO from self-encoded trace
set -eu

TRACE="$1"
OUT="$2"

mkdir -p "$OUT/WORLD" "$OUT/REPO/bin" "$OUT/REPO/interrupts"

# Decode FILE/DATA/END_FILE blocks
awk -F '\t' '
$1=="FILE" {
    # FILE path <p> sha256 <h> mode <m> bytes <n>
    path = $3
    mode = $7
    cur = path
    curmode = mode
    data = ""
    next
}
$1=="DATA" {
    data = data $2 "\n"
    next
}
$1=="END_FILE" {
    print cur "\t" curmode "\t" data
    cur = ""
    curmode = ""
    data = ""
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
            echo "warning: skipping unknown vpath: $vpath" >&2
            continue
            ;;
    esac

    # Decode base64
    printf "%s" "$b64" | base64 -d > "$dest"
    chmod "$mode" "$dest" 2>/dev/null || echo "warning: could not set mode $mode on $dest" >&2
done

echo "Reconstructed files to $OUT/"
