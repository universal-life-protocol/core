#!/bin/sh
# bin/explain.sh - Explain interrupt admissibility
set -eu

if [ $# -lt 2 ]; then
    echo "Usage: $0 <world_dir> <interrupt_name>" >&2
    exit 1
fi

WORLD="$1"
INTR="$2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

awk -v WORLD_DIR="$WORLD" -v EXPLAIN_INTR="$INTR" -f "$SCRIPT_DIR/poly.awk"
