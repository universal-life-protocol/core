#!/bin/sh
# test_admissibility.sh - Verify open-envelope and sign constraints
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
TMPDIR="$(mktemp -d)"
WORLD="$TMPDIR/world"

cleanup() {
    rm -rf "$TMPDIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$WORLD"

cat > "$WORLD/.atom" <<'ATOM'
atom a
atom b
ATOM

cat > "$WORLD/.manifest" <<'MAN'
max_degree 2
MAN

cat > "$WORLD/.procedure" <<'PROC'
procedure demo v3
domain:
  +1 a
end domain
mode open
sign same
shadow first_atom
end procedure
PROC

cat > "$WORLD/.interrupt" <<'INTR'
interrupt BAD v3
poly:
  -1 a
end poly
end interrupt

interrupt OK v3
poly:
  +1 a.b
end poly
end interrupt
INTR

output=$(awk -v WORLD_DIR="$WORLD" -f "$BASE_DIR/bin/poly.awk")

if ! echo "$output" | grep -q "BIND demo BAD ok 0 reason envelope_sign_mismatch"; then
    echo "FAIL: expected BAD to fail with sign mismatch" >&2
    exit 1
fi

if ! echo "$output" | grep -q "BIND demo OK ok 1 reason ok"; then
    echo "FAIL: expected OK to be admissible" >&2
    exit 1
fi

first_bind=$(echo "$output" | awk '$1=="BIND" {print $3; exit}')
if [ "$first_bind" != "BAD" ]; then
    echo "FAIL: expected deterministic interrupt order (BAD first)" >&2
    exit 1
fi

echo "PASS: admissibility"
