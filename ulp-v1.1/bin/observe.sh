#!/bin/sh
# bin/observe.sh - Apply projection to trace
# ULP v1.1 - Pure projection engine
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
