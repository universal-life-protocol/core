#!/bin/sh
#===============================================================================
# projections/text/pure.sh - Pure Functional Hash View
#===============================================================================
# ULP v1.1 - π_pure projection
#
# PURPOSE:
#   Render trace as functional hash composition showing information flow.
#   Demonstrates the pure functional nature of ULP execution.
#
# USAGE:
#   ./projections/text/pure.sh TRACE_FILE
#
# INPUT:
#   - TRACE_FILE: ULP trace in tab-separated format
#
# OUTPUT:
#   - stdout: Functional composition notation
#
# FORMAT:
#   h(input) = hash
#   f(h(input)) = h(output)
#   composition chain showing pure transformations
#
# PRESERVES:
#   - Principle 3: Pure function (read-only, deterministic, no side effects)
#
#===============================================================================
set -eu

TRACE="${1:-/dev/stdin}"

hash_data() {
    if command -v sha256sum >/dev/null 2>&1; then
        echo -n "$1" | sha256sum | awk '{print substr($1,1,8)}'
    elif command -v shasum >/dev/null 2>&1; then
        echo -n "$1" | shasum -a 256 | awk '{print substr($1,1,8)}'
    else
        echo -n "$1" | openssl dgst -sha256 | awk '{print substr($NF,1,8)}'
    fi
}

awk -F'\t' -v hash_cmd="$(which sha256sum shasum openssl | head -1)" '
BEGIN {
    print "# Pure Functional View"
    print "# Trace as composition of hash functions"
    print ""
}

$1 == "WORLD" && NF >= 3 {
    wid = $3
    print "World = h(" substr(wid, 1, 12) "...)"
    print ""
}

$1 == "STDIN" && NF >= 5 {
    if (!seen_input) {
        print "# Input hashes:"
        seen_input = 1
    }
    text = $5
    # Compute hash inline
    cmd = "echo -n \"" text "\" | sha256sum 2>/dev/null || echo -n \"" text "\" | shasum -a 256 2>/dev/null || echo -n \"" text "\" | openssl dgst -sha256"
    cmd | getline hash_result
    close(cmd)
    split(hash_result, parts)
    hash_val = substr(parts[1], 1, 8)
    print "  input[" $2 "] = h(" text ") = " hash_val
    inputs[NR] = hash_val
}

$1 == "STDOUT" && NF >= 5 {
    if (!seen_output) {
        print ""
        print "# Output hashes:"
        seen_output = 1
    }
    text = $5
    cmd = "echo -n \"" text "\" | sha256sum 2>/dev/null || echo -n \"" text "\" | shasum -a 256 2>/dev/null || echo -n \"" text "\" | openssl dgst -sha256"
    cmd | getline hash_result
    close(cmd)
    split(hash_result, parts)
    hash_val = substr(parts[1], 1, 8)
    gsub(/\\n/, " ", text)
    if (length(text) > 30) text = substr(text, 1, 30) "..."
    print "  output[" $2 "] = f(input) = " hash_val "  # \"" text "\""
    outputs[NR] = hash_val
}

$1 == "EXEC" && NF >= 8 {
    intr = $8
    if (intr != "") {
        if (!seen_exec) {
            print ""
            print "# Function composition:"
            seen_exec = 1
        }
        print "  " intr ": input → output  (pure transformation)"
    }
}

END {
    print ""
    print "# Trace = composition of pure functions"
    print "# Each step: f_n(h_input) = h_output"
    print "# Deterministic: same inputs → same outputs"
}
' "$TRACE"
