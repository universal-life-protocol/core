#!/bin/sh
# bin/decode_trace.sh
# Reconstruct WORLD + REPO files from a self-encoded trace.
# Usage: decode_trace.sh <trace.log> <output_dir>

set -eu

TRACE="$1"
OUT="$2"

mkdir -p "$OUT/WORLD" "$OUT/REPO/bin" "$OUT/REPO/interrupts"

# Decode FILE/DATA blocks - AWK handles everything
awk -F '\t' -v outdir="$OUT" '
$1=="FILE" {
    # FILE path <p> sha256 <h> mode <m> bytes <n>
    vpath=$3
    mode=$7
    data=""
    next
}
$1=="DATA" {
    data = data $2 "\n"
    next
}
$1=="END_FILE" && vpath != "" {
    # Write the file
    if (vpath ~ /^WORLD\//) {
        dest = outdir "/WORLD/" substr(vpath, 7)
    } else if (vpath ~ /^REPO\/bin\//) {
        dest = outdir "/REPO/bin/" substr(vpath, 10)
    } else if (vpath ~ /^REPO\/interrupts\//) {
        dest = outdir "/REPO/interrupts/" substr(vpath, 17)
    } else {
        print "Warning: skipping unknown vpath: " vpath > "/dev/stderr"
        vpath = ""
        mode = ""
        data = ""
        next
    }

    # Decode base64 and write to file
    cmd = "base64 -d > " dest
    printf "%s", data | cmd
    close(cmd)

    # Set file mode
    if (mode != "") {
        system("chmod " mode " " dest " 2>/dev/null")
    }

    vpath = ""
    mode = ""
    data = ""
    next
}
' "$TRACE"

echo "Reconstructed files to $OUT/"
