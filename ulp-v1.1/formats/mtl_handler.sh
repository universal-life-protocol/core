#!/bin/sh
# formats/mtl_handler.sh - MTL format handler
# Processes mtl format data in ULP traces
set -eu
TRACE="${1:-/dev/stdin}"
echo "# MTL handler - trace data processing"
echo "# Format: mtl"
cat "$TRACE" | awk -F'\t' '$1=="DATA" {print $2}'
