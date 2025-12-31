#!/bin/sh
# projections/3d/vulkan.sh - Vulkan rendering projection
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
