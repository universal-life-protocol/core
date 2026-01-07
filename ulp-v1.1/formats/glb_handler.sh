#!/bin/sh
# formats/glb_handler.sh - GLB format handler
# Processes glb format data in ULP traces
set -eu
TRACE="${1:-/dev/stdin}"
echo "# GLB handler - trace data processing"
echo "# Format: glb"
cat "$TRACE" | awk -F'\t' '$1=="DATA" {print $2}'
