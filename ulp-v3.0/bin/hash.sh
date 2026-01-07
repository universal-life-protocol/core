#!/bin/sh
# bin/hash.sh: print SHA-256 hex of stdin
# Portable across sha256sum, shasum, openssl
set -eu

if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 | awk '{print $2}'
else
    echo "error: need sha256sum or shasum or openssl" >&2
    exit 127
fi
