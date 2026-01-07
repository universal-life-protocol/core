#!/bin/sh
# formats/obj_handler.sh - OBJ format handler
# Processes obj format data in ULP traces
set -eu
TRACE="${1:-/dev/stdin}"
echo "# OBJ handler - trace data processing"
echo "# Format: obj"
cat "$TRACE" | awk -F'\t' '$1=="DATA" {print $2}'
