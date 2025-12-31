#!/bin/sh
#===============================================================================
# bin/observe.sh - ULP v1.1 Pure Projection Application
#===============================================================================
# ULP v1.1 - POSIX projection implementation
#
# PURPOSE:
#   Apply a pure projection to extract view from trace.
#   Default: π_posix (POSIX stdout view)
#   This is a PURE FUNCTION: read-only, deterministic, no side effects.
#
# USAGE:
#   ./bin/observe.sh [WORLD_DIR] TRACE_FILE
#
# ARGUMENTS:
#   WORLD_DIR  - World definition directory (default: world)
#   TRACE_FILE - Trace file to project (required)
#
# INPUT:
#   - TRACE_FILE: ULP trace in tab-separated format
#   - WORLD_DIR/.view: Optional view type declaration
#
# OUTPUT:
#   - stdout: Projected view (unescaped text for canonical view)
#   - stderr: Error messages
#
# PROJECTION TYPES:
#   canonical (default) - Extract STDOUT records, unescape
#   raw                 - Show complete trace
#
# PURITY GUARANTEES:
#   - Read-only: Does not modify trace file
#   - Deterministic: Same trace → same output
#   - No side effects: No file writes, no network, no state mutation
#   - Pure transformation: Trace → View
#
# ESCAPE SEQUENCES (canonical view):
#   \\n → newline
#   \\t → tab
#   \\r → carriage return
#   \\\\ → backslash
#
# EXIT CODES:
#   0   - Success
#   1   - Error (file not found, unknown view type)
#   127 - Missing required tools (awk)
#
# PRESERVES:
#   - Principle 3: Projections are pure functions
#   - Read-only operation
#   - Deterministic output
#
# DEPENDENCIES:
#   - awk (any variant)
#
# EXAMPLE:
#   echo "hello" | ./bin/run.sh world out
#   ./bin/observe.sh world out/trace.log
#   # Output: (whatever the interrupt produces)
#
#===============================================================================
set -eu

WORLD="${1:-world}"
TRACE="$2"

# Determine view type
if [ -f "$WORLD/.view" ]; then
    view_type="$(awk '$1=="view" {print $2; exit}' "$WORLD/.view" 2>/dev/null || echo "canonical")"
else
    view_type="canonical"
fi

# Apply pure projection
case "$view_type" in
    canonical)
        # Show stdout lines (POSIX view)
        awk -F '\t' '
        $1=="STDOUT" && NF>=5 {
            text = $5
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
        # Show complete trace
        cat "$TRACE"
        ;;
    *)
        echo "error: unknown view type: $view_type" >&2
        exit 1
        ;;
esac
