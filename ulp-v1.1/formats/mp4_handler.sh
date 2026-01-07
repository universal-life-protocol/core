#!/bin/sh
# formats/mp4_handler.sh - MP4 format handler
# Processes mp4 format data in ULP traces
set -eu
TRACE="${1:-/dev/stdin}"
echo "# MP4 handler - trace data processing"
echo "# Format: mp4"
cat "$TRACE" | awk -F'\t' '$1=="DATA" {print $2}'
