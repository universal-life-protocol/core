#!/bin/sh
# bin/canon.sh: canonicalize dotfiles → WID
# Usage: canon.sh <world_dir>
# Output: WID (sha256 of canonicalized dotfiles)

set -eu

WORLD_DIR="${1:?missing world directory}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Required dotfiles (v2.0 spec)
REQUIRED_DOTFILES=".genesis .env .schema .atom .manifest .sequence .include .ignore .interrupt .view .record .symmetry"

# Canonicalize a single dotfile
# Rules:
# - Remove comments
# - Remove blank lines
# - Sort lines (stable)
# - Trim whitespace
canonicalize_file() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo "error: missing required dotfile: $file" >&2
        return 1
    fi

    # Identifier-only validation
    if grep -q '[^[:print:][:space:]]' "$file"; then
        echo "error: non-printable characters in $file" >&2
        return 1
    fi

    # Canonicalize: remove comments, blank lines, sort
    grep -v '^#' "$file" | \
        grep -v '^[[:space:]]*$' | \
        sort | \
        sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

# Build canonical representation
CANONICAL=""

for dotfile in $REQUIRED_DOTFILES; do
    filepath="$WORLD_DIR/$dotfile"

    # Special case: .procedure has structural syntax, don't sort
    if [ "$dotfile" = ".procedure" ]; then
        if [ -f "$filepath" ]; then
            content=$(grep -v '^#' "$filepath" | grep -v '^[[:space:]]*$')
            CANONICAL="${CANONICAL}${dotfile}=${content}"$'\n'
        fi
    else
        if [ -f "$filepath" ]; then
            content=$(canonicalize_file "$filepath")
            CANONICAL="${CANONICAL}${dotfile}=${content}"$'\n'
        fi
    fi
done

# Compute WID
echo "$CANONICAL" | "$SCRIPT_DIR/hash.sh"
