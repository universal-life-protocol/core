#!/bin/sh
# projections/analysis/print.sh - Print/PDF output
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
