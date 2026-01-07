#!/bin/sh
#===============================================================================
# projections/text/posix.sh - POSIX Projection Implementation
#===============================================================================
# ULP v1.1 - π_posix projection
#
# PURPOSE:
#   Extract STDOUT records from trace and render as POSIX stdout text.
#   This is the canonical "what the program printed" view.
#
# USAGE:
#   ./projections/text/posix.sh TRACE_FILE
#
# INPUT:
#   - TRACE_FILE: ULP trace in tab-separated format
#
# OUTPUT:
#   - stdout: Unescaped STDOUT text (exactly what program output)
#
# PROJECTION:
#   π_posix(trace) = Extract STDOUT records, unescape, concatenate
#
# ESCAPE SEQUENCES:
#   \\n → newline
#   \\t → tab
#   \\r → carriage return
#   \\\\ → backslash
#
# PRESERVES:
#   - Principle 3: Pure function (read-only, deterministic, no side effects)
#
#===============================================================================
set -eu

TRACE="${1:-/dev/stdin}"

awk -F'\t' '
$1 == "STDOUT" && NF >= 5 {
    text = $5
    # Unescape in correct order
    gsub(/\\\\/, "\x00", text)  # Temporary placeholder for backslash
    gsub(/\\n/, "\n", text)
    gsub(/\\t/, "\t", text)
    gsub(/\\r/, "\r", text)
    gsub(/\x00/, "\\", text)    # Restore backslash
    print text
}
' "$TRACE"
