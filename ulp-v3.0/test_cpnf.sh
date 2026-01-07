#!/bin/sh
# test_cpnf.sh - Verify CPNF ordering for procedure/interrupt polynomials
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
TMPDIR="$(mktemp -d)"
WORLD="$TMPDIR/world"
TRACE="$TMPDIR/algebra.log"

cleanup() {
    rm -rf "$TMPDIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$WORLD"

cat > "$WORLD/.atom" <<'ATOM'
atom a
atom b
ATOM

: > "$WORLD/.manifest"

cat > "$WORLD/.procedure" <<'PROC'
procedure demo v3
domain:
  +1 b.a
  +2 a
  +1 a.b
end domain
mode open
sign same
shadow first_atom
end procedure
PROC

cat > "$WORLD/.interrupt" <<'INTR'
interrupt ZETA v3
poly:
  +3 b.a
  +1 a
  +2 a.b
end poly
end interrupt
INTR

awk -v WORLD_DIR="$WORLD" -v TRACE_FILE="$TRACE" -f "$BASE_DIR/bin/poly.awk" >/dev/null

proc_order=$(awk '/^#ALG ALG_PROC_POLY/ {print $4}' "$TRACE" | paste -sd "," -)
expected_proc="a,a.b,b.a"
if [ "$proc_order" != "$expected_proc" ]; then
    echo "FAIL: procedure CPNF order mismatch" >&2
    echo "  expected: $expected_proc" >&2
    echo "  got:      $proc_order" >&2
    exit 1
fi

intr_order=$(awk '/^#ALG ALG_INTR_POLY/ {print $5}' "$TRACE" | paste -sd "," -)
expected_intr="a,a.b,b.a"
if [ "$intr_order" != "$expected_intr" ]; then
    echo "FAIL: interrupt CPNF order mismatch" >&2
    echo "  expected: $expected_intr" >&2
    echo "  got:      $intr_order" >&2
    exit 1
fi

echo "PASS: CPNF ordering"
