#!/bin/sh
# bin/self_encode.sh - ULP v3.0 self-encoding bundle
# Appends FILE/DATA records to trace containing complete reproduction capability
# Usage: self_encode.sh <world_dir> <trace_path>

set -eu

WORLD="${1:?missing world directory}"
TRACE="${2:?missing trace path}"
REPO="${3:-.}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

hash_stdin() {
    "$SCRIPT_DIR/hash.sh"
}

# List files deterministically (v2.0 includes .symmetry)
list_files() {
    # World dotfiles
    for dotfile in .genesis .env .schema .atom .manifest .sequence .include .ignore .interrupt .procedure .view .record .symmetry; do
        if [ -f "$WORLD/$dotfile" ]; then
            echo "WORLD/$dotfile"
        fi
    done

    # Repository files
    find "$REPO/bin" -maxdepth 1 -type f \( -name "*.sh" -o -name "*.awk" \) 2>/dev/null | sort | sed 's|^|REPO/|'
    find "$REPO/interrupts" -maxdepth 1 -type f 2>/dev/null | sort | sed 's|^|REPO/|'
}

# Read file by virtual path
cat_file() {
    vpath="$1"
    case "$vpath" in
        WORLD/*) cat "$WORLD/${vpath#WORLD/}" ;;
        REPO/*) cat "$REPO/${vpath#REPO/}" ;;
        *) return 1 ;;
    esac
}

# Get file mode (portable across stat implementations)
file_mode() {
    vpath="$1"
    case "$vpath" in
        WORLD/*) p="$WORLD/${vpath#WORLD/}" ;;
        REPO/*) p="$REPO/${vpath#REPO/}" ;;
    esac

    # Try different stat implementations
    if stat -c '%a' "$p" >/dev/null 2>&1; then
        stat -c '%a' "$p"
    elif stat -f '%Lp' "$p" >/dev/null 2>&1; then
        stat -f '%Lp' "$p"
    else
        # Fallback: check shebang
        if head -1 "$p" 2>/dev/null | grep -q "^#!"; then
            echo 755
        else
            echo 644
        fi
    fi
}

# Build manifest hash (deterministic)
manifest_hash() {
    list_files | sort | while IFS= read -r vpath; do
        bytes="$(cat_file "$vpath" | wc -c | awk '{print $1}')"
        sha="$(cat_file "$vpath" | hash_stdin)"
        mode="$(file_mode "$vpath")"
        printf "%s\0%s\0%s\0%s\n" "$vpath" "$sha" "$mode" "$bytes"
    done | hash_stdin
}

# Append self-encoding bundle
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

        # Base64 encode with stable 76-char line width
        cat_file "$vpath" | base64 | fold -w 76 | awk '{print "DATA\t" $0}' >> "$TRACE"
        printf "END_FILE\tpath\t%s\n" "$vpath" >> "$TRACE"
    done
}

append_bundle
