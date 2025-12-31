#!/bin/sh
# bin/hash.sh - Portable SHA-256 hashing
# ULP v1.1 - Part of sealed architecture
set -eu

if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 | awk '{print $2}'
else
    echo "error: need sha256sum, shasum, or openssl for hashing" >&2
    exit 127
fi
