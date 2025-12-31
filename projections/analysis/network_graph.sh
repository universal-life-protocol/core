#!/bin/sh
# projections/analysis/network_graph.sh - Network topology graph
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
