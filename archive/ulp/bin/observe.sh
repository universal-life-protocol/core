#!/bin/sh
# bin/observe.sh
# Observe a trace according to .view specification
# Usage: observe.sh <world> <trace_file>

set -eu

WORLD="$1"
TRACE="$2"

if [ -f "$WORLD/.view" ]; then
    # Read view specification
    view_type="$(awk '$1=="view" {print $2; exit}' "$WORLD/.view" 2>/dev/null || echo "canonical")"

    case "$view_type" in
        canonical)
            # Simple canonical view: show stdout lines
            awk -F '\t' '
            $1=="STDOUT" && NF>=5 {
                text=$5
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
            # Raw view: show everything
            cat "$TRACE"
            ;;
        *)
            echo "Unknown view type: $view_type" >&2
            exit 1
            ;;
    esac
else
    # Default view
    awk -F '\t' '$1=="STDOUT" && NF>=5 {print $5}' "$TRACE" | sed 's/\\n/\n/g; s/\\t/\t/g; s/\\\\/\\/g'
fi
