#!/bin/sh
# formats/wav_handler.sh - WAV format handler
# Processes wav format data in ULP traces
set -eu
TRACE="${1:-/dev/stdin}"
echo "# WAV handler - trace data processing"
echo "# Format: wav"
cat "$TRACE" | awk -F'\t' '$1=="DATA" {print $2}'
