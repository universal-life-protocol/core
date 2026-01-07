#!/bin/sh
# test_trace_schema.sh - Verify core trace records for v3.0
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
TMPDIR="$(mktemp -d)"
WORLD="$TMPDIR/world"
OUTDIR="$TMPDIR/out"

cleanup() {
    rm -rf "$TMPDIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$WORLD"

cp "$BASE_DIR/world/.genesis" "$WORLD/.genesis"
cp "$BASE_DIR/world/.env" "$WORLD/.env"
cp "$BASE_DIR/world/.schema" "$WORLD/.schema"
cp "$BASE_DIR/world/.atom" "$WORLD/.atom"
cp "$BASE_DIR/world/.manifest" "$WORLD/.manifest"
cp "$BASE_DIR/world/.sequence" "$WORLD/.sequence"
cp "$BASE_DIR/world/.include" "$WORLD/.include"
cp "$BASE_DIR/world/.ignore" "$WORLD/.ignore"
cp "$BASE_DIR/world/.interrupt" "$WORLD/.interrupt"
cp "$BASE_DIR/world/.procedure" "$WORLD/.procedure"
cp "$BASE_DIR/world/.view" "$WORLD/.view"
cp "$BASE_DIR/world/.record" "$WORLD/.record"
cp "$BASE_DIR/world/.symmetry" "$WORLD/.symmetry"

printf 'hello\nworld\n' | "$BASE_DIR/bin/run.sh" "$WORLD" "$OUTDIR" >/dev/null

TRACE="$OUTDIR/trace.log"

if ! grep -q '^HDR[[:space:]]version[[:space:]]3' "$TRACE"; then
    echo "FAIL: missing HDR version 3" >&2
    exit 1
fi

if ! grep -q '^BALL[[:space:]]wid[[:space:]]' "$TRACE"; then
    echo "FAIL: missing BALL WID" >&2
    exit 1
fi

if ! grep -q '^POLICY[[:space:]]e8l[[:space:]]' "$TRACE"; then
    echo "FAIL: missing policy E8L" >&2
    exit 1
fi

if ! grep -q '^GEOMETRY[[:space:]]projective[[:space:]]' "$TRACE"; then
    echo "FAIL: missing geometry" >&2
    exit 1
fi

if ! grep -q '^REPLICA[[:space:]]slots[[:space:]]' "$TRACE"; then
    echo "FAIL: missing replica slots" >&2
    exit 1
fi

if ! grep -q '^MANIFEST[[:space:]]sha256[[:space:]]' "$TRACE"; then
    echo "FAIL: missing self-encoding manifest" >&2
    exit 1
fi

echo "PASS: trace schema"
