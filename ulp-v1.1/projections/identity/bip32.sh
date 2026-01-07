#!/bin/sh
# projections/identity/bip32.sh - BIP32 key derivation
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
