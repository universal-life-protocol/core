#!/bin/sh
# formats/svg_handler.sh - SVG format handler
# Processes svg format data in ULP traces
set -eu
TRACE="${1:-/dev/stdin}"
echo "# SVG handler - trace data processing"
echo "# Format: svg"
cat "$TRACE" | awk -F'\t' '$1=="DATA" {print $2}'
