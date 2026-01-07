#!/bin/sh
# test_determinism.sh - Verify byte-for-byte determinism
# ULP v3.0 critical invariant: same inputs → identical traces

set -eu

echo "=== ULP v3.0 Determinism Test ==="
echo

# Clean previous outputs
rm -rf out1 out2 2>/dev/null || true

# Run 1
echo "Run 1: Executing..."
RID1=$(echo -e 'hello\nworld' | ./bin/run.sh world out1 2>/dev/null)
echo "  RID: $RID1"

# Run 2
echo "Run 2: Executing..."
RID2=$(echo -e 'hello\nworld' | ./bin/run.sh world out2 2>/dev/null)
echo "  RID: $RID2"

# Verify RIDs match
if [ "$RID1" != "$RID2" ]; then
    echo "❌ FAIL: RIDs differ"
    echo "  Run 1: $RID1"
    echo "  Run 2: $RID2"
    exit 1
fi

echo "✓ RIDs match"

# Verify byte-for-byte trace identity
if cmp -s out1/trace.log out2/trace.log; then
    echo "✓ Traces are byte-for-byte identical"
else
    echo "❌ FAIL: Traces differ"
    diff out1/trace.log out2/trace.log | head -20
    exit 1
fi

# Verify policy derivation is deterministic
E8L1=$(grep "^POLICY	e8l" out1/trace.log | awk '{print $3}')
E8L2=$(grep "^POLICY	e8l" out2/trace.log | awk '{print $3}')
E8R1=$(grep "^POLICY	e8r" out1/trace.log | awk '{print $3}')
E8R2=$(grep "^POLICY	e8r" out2/trace.log | awk '{print $3}')

if [ "$E8L1" != "$E8L2" ] || [ "$E8R1" != "$E8R2" ]; then
    echo "❌ FAIL: Policy seeds differ"
    exit 1
fi

echo "✓ Policy seeds deterministic"

# Verify geometry selection is deterministic
GEOM1=$(grep "^GEOMETRY" out1/trace.log | sort)
GEOM2=$(grep "^GEOMETRY" out2/trace.log | sort)

if [ "$GEOM1" != "$GEOM2" ]; then
    echo "❌ FAIL: Geometry selection differs"
    exit 1
fi

echo "✓ Geometry selection deterministic"

# Verify replica slots are deterministic
SLOTS1=$(grep "^REPLICA" out1/trace.log)
SLOTS2=$(grep "^REPLICA" out2/trace.log)

if [ "$SLOTS1" != "$SLOTS2" ]; then
    echo "❌ FAIL: Replica slots differ"
    exit 1
fi

echo "✓ Replica slots deterministic"

echo
echo "=== ALL TESTS PASSED ==="
echo "Determinism verified:"
echo "  • Execution → identical RID"
echo "  • Trace → byte-for-byte identical"
echo "  • Policy → deterministic seeds"
echo "  • Geometry → deterministic selection"
echo "  • Replicas → deterministic slots"
echo
echo "RID: $RID1"
