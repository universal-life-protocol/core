#!/bin/sh
# projections/meta/raw.sh - Raw trace output
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
