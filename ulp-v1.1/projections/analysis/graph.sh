#!/bin/sh
# projections/analysis/graph.sh - Execution graph
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
