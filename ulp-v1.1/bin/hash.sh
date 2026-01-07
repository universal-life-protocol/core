#!/bin/sh
#===============================================================================
# bin/hash.sh - Portable SHA-256 Hashing Utility
#===============================================================================
# ULP v1.1 - Part of sealed architecture
#
# PURPOSE:
#   Compute SHA-256 hash of stdin in a portable way across platforms.
#   Tries multiple hash implementations: sha256sum, shasum, openssl.
#
# USAGE:
#   cat file | ./bin/hash.sh
#   echo "data" | ./bin/hash.sh
#   ./bin/hash.sh < input.txt
#
# INPUT:
#   - stdin: Data to hash
#
# OUTPUT:
#   - stdout: 64-character hex SHA-256 hash
#   - stderr: Error messages if no hash tool available
#
# EXIT CODES:
#   0   - Success
#   127 - No hash tool available (sha256sum, shasum, or openssl)
#
# PRESERVES:
#   - Principle 3: Pure function (no side effects)
#   - Deterministic: same input → same hash
#
# PLATFORMS:
#   - Linux: Uses sha256sum
#   - macOS/BSD: Uses shasum -a 256
#   - Fallback: Uses openssl dgst -sha256
#   - Termux/Android: Compatible
#
#===============================================================================
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
