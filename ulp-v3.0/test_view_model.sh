#!/bin/sh
# test_view_model.sh - Verify view model rendering from trace + .view
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
TMPDIR="$(mktemp -d)"

cleanup() {
    rm -rf "$TMPDIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP

VIEW_FILE="$BASE_DIR/examples/quadrants-octree.view"
TRACE_JSON="$BASE_DIR/examples/trace-quadrants.json"
EXPECTED="$BASE_DIR/examples/view-model-expected.json"
OUTPUT="$TMPDIR/view-model.json"

"$BASE_DIR/bin/view_model.sh" "$VIEW_FILE" "$TRACE_JSON" "$OUTPUT"

if ! cmp "$OUTPUT" "$EXPECTED" >/dev/null 2>&1; then
    echo "FAIL: view model output mismatch" >&2
    diff -u "$EXPECTED" "$OUTPUT" >&2 || true
    exit 1
fi

echo "PASS: view model renderer"
