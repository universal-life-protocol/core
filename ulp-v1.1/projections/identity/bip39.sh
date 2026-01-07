#!/bin/sh
# projections/identity/bip39.sh - BIP39 mnemonic generation
# ULP v1.1 projection implementation
set -eu
TRACE="${1:-/dev/stdin}"
cat "$TRACE"
