#!/bin/sh
# test_conformance.sh - Run v3.0 core conformance tests
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

for test_file in "$BASE_DIR"/test_*.sh; do
    case "$test_file" in
        */test_conformance.sh) continue ;;
    esac
    echo "Running $(basename "$test_file")"
    sh "$test_file"
    echo
    done

echo "All v3.0 conformance tests passed"
