#!/bin/sh
# bin/canon.sh: canonicalize dotfiles → WID
# Usage: canon.sh <world_dir>
# Output: WID (sha256 of canonicalized dotfiles)

set -eu

WORLD_DIR="${1:?missing world directory}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Required dotfiles (v3.0 spec)
REQUIRED_DOTFILES=".genesis .env .schema .atom .manifest .sequence .include .ignore .interrupt .procedure .view .record .symmetry"

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

canonicalize_procedure() {
    awk '
    function trim(s){ sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
    function monodeg(m,    n, a){ if (m == "") return 0; n = split(m, a, "."); return n }
    function cmp_terms(a, b,    aa, bb, am, bm, ad, bd){
        split(a, aa, " ")
        split(b, bb, " ")
        am = aa[2]; bm = bb[2]
        ad = monodeg(am); bd = monodeg(bm)
        if (ad < bd) return -1
        if (ad > bd) return 1
        return (am < bm) ? -1 : (am > bm ? 1 : 0)
    }
    function sort_terms(    i, j, tmp){
        for (i = 1; i <= term_count; i++) {
            for (j = i + 1; j <= term_count; j++) {
                if (cmp_terms(terms[i], terms[j]) > 0) {
                    tmp = terms[i]; terms[i] = terms[j]; terms[j] = tmp
                }
            }
        }
    }
    /^[ \t]*#/ { next }
    /^[ \t]*$/ { next }
    {
        line = trim($0)
        if (line == "domain:") { in_domain = 1; saw_domain = 1; next }
        if (line == "end domain") { in_domain = 0; next }
        if (in_domain && line ~ /^[ \t]*[+-]/) {
            coef = $1
            mono = $2
            if (mono != "") {
                E[mono] += coef
            }
            next
        }
        headers[++header_count] = line
    }
    END {
        for (i = 1; i <= header_count; i++) {
            print headers[i]
        }
        for (m in E) {
            if (E[m] != 0) {
                terms[++term_count] = sprintf("%+d %s", E[m], m)
            }
        }
        if (saw_domain || term_count > 0) {
            sort_terms()
            print "domain:"
            for (i = 1; i <= term_count; i++) {
                print terms[i]
            }
            print "end domain"
        }
    }
    ' "$1"
}

canonicalize_interrupt() {
    awk '
    function trim(s){ sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
    function monodeg(m,    n, a){ if (m == "") return 0; n = split(m, a, "."); return n }
    function cmp_terms(a, b,    aa, bb, am, bm, ad, bd){
        split(a, aa, " ")
        split(b, bb, " ")
        am = aa[2]; bm = bb[2]
        ad = monodeg(am); bd = monodeg(bm)
        if (ad < bd) return -1
        if (ad > bd) return 1
        return (am < bm) ? -1 : (am > bm ? 1 : 0)
    }
    function sort_terms(    i, j, tmp){
        for (i = 1; i <= term_count; i++) {
            for (j = i + 1; j <= term_count; j++) {
                if (cmp_terms(terms[i], terms[j]) > 0) {
                    tmp = terms[i]; terms[i] = terms[j]; terms[j] = tmp
                }
            }
        }
    }
    function sort_names(    i, j, tmp){
        for (i = 1; i <= name_count; i++) {
            for (j = i + 1; j <= name_count; j++) {
                if (names[i] > names[j]) {
                    tmp = names[i]; names[i] = names[j]; names[j] = tmp
                }
            }
        }
    }
    /^[ \t]*#/ { next }
    /^[ \t]*$/ { next }
    {
        line = trim($0)
        if (line ~ /^interrupt[ \t]+/) {
            split(line, a, /[ \t]+/)
            current = a[2]
            if (!(current in seen)) {
                seen[current] = 1
                names[++name_count] = current
            }
            header[current] = line
            next
        }
        if (line == "poly:") { in_poly = 1; saw_poly[current] = 1; next }
        if (line == "end poly") { in_poly = 0; next }
        if (line == "end interrupt") { current = ""; next }
        if (in_poly && line ~ /^[ \t]*[+-]/) {
            coef = $1
            mono = $2
            if (mono != "") {
                I[current, mono] += coef
            }
            next
        }
        if (current != "") {
            other[current, ++other_count[current]] = line
        }
    }
    END {
        sort_names()
        for (ni = 1; ni <= name_count; ni++) {
            intr = names[ni]
            if (header[intr] != "") {
                print header[intr]
            } else {
                print "interrupt " intr
            }
            for (oi = 1; oi <= other_count[intr]; oi++) {
                print other[intr, oi]
            }
            term_count = 0
            for (k in I) {
                split(k, a, SUBSEP)
                if (a[1] == intr) {
                    if (I[intr, a[2]] != 0) {
                        terms[++term_count] = sprintf("%+d %s", I[intr, a[2]], a[2])
                    }
                }
            }
            if (saw_poly[intr] || term_count > 0) {
                sort_terms()
                print "poly:"
                for (ti = 1; ti <= term_count; ti++) {
                    print terms[ti]
                }
                print "end poly"
            }
            print "end interrupt"
        }
    }
    ' "$1"
}

# Build canonical representation
CANONICAL=""

for dotfile in $REQUIRED_DOTFILES; do
    filepath="$WORLD_DIR/$dotfile"

    # Special case: .procedure/.interrupt have algebraic syntax
    if [ "$dotfile" = ".procedure" ]; then
        if [ -f "$filepath" ]; then
            content=$(canonicalize_procedure "$filepath")
            CANONICAL="${CANONICAL}${dotfile}=${content}"$'\n'
        fi
    elif [ "$dotfile" = ".interrupt" ]; then
        if [ -f "$filepath" ]; then
            content=$(canonicalize_interrupt "$filepath")
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
