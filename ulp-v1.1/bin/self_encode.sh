#!/bin/sh
# bin/self_encode.sh - Self-encoding bundle creation
# ULP v1.1 - Appends MANIFEST/FILE/DATA records to trace
set -eu

ROOT="$1"
TRACE="$2"
REPO="${3:-.}"

hash_stdin() {
    ./bin/hash.sh
}

# List files deterministically
list_files() {
    # World dotfiles
    (
        cd "$ROOT" 2>/dev/null && ls -1a | awk '/^\./{print}'
    ) | awk '
    $0==".genesis" || $0==".env" || $0==".atom" || $0==".manifest" ||
    $0==".schema" || $0==".sequence" || $0==".include" || $0==".ignore" ||
    $0==".procedure" || $0==".interrupt" || $0==".view" || $0==".record" ||
    $0==".interpose" || $0==".projection" { print "WORLD/" $0 }
    '

    # Repo bin scripts
    find "$REPO/bin" -maxdepth 1 -type f \( -name "*.sh" -o -name "*.awk" \) -print 2>/dev/null | \
        sort | sed 's|^\./||' | sed 's|^|REPO/|'

    # Interrupts
    find "$REPO/interrupts" -maxdepth 1 -type f -print 2>/dev/null | \
        sort | sed 's|^\./||' | sed 's|^|REPO/|'
}

# Read file by virtual path
cat_file() {
    vpath="$1"
    case "$vpath" in
        WORLD/*) cat "$ROOT/${vpath#WORLD/}" ;;
        REPO/*) cat "$REPO/${vpath#REPO/}" ;;
        *) return 1 ;;
    esac
}

# Get file mode
file_mode() {
    vpath="$1"
    case "$vpath" in
        WORLD/*) p="$ROOT/${vpath#WORLD/}" ;;
        REPO/*) p="$REPO/${vpath#REPO/}" ;;
    esac

    # Try different stat implementations
    if stat -c '%a' "$p" >/dev/null 2>&1; then
        stat -c '%a' "$p"
    elif stat -f '%Lp' "$p" >/dev/null 2>&1; then
        stat -f '%Lp' "$p"
    else
        # Fallback: check for shebang
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

        # Encode file content in base64 with 76-char line width
        cat_file "$vpath" | base64 | fold -w 76 | awk '{print "DATA\t" $0}' >> "$TRACE"
        printf "END_FILE\tpath\t%s\n" "$vpath" >> "$TRACE"
    done
}

append_bundle
