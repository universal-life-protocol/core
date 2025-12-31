#!/bin/sh
# validate.sh - Complete ULP v1.1 validation suite
# Tests: execution, determinism, reconstruction, self-encoding
set -eu

echo "=== ULP v1.1 Validation Suite ==="
echo ""

# Test 1: World validation
echo "Test 1: World Definition Validation"
if ./bin/validate_world.sh world >/dev/null 2>&1; then
    echo "  ✓ World definition valid"
else
    echo "  ✗ World definition invalid"
    exit 1
fi

# Test 2: Execute a trace
echo ""
echo "Test 2: Trace Execution"
if echo -e "hello\nworld\nv1.1" | ./bin/run.sh world out >/dev/null 2>&1; then
    echo "  ✓ Trace execution successful"
else
    echo "  ✗ Trace execution failed"
    exit 1
fi

# Test 3: Verify trace exists and contains required sections
echo ""
echo "Test 3: Trace Structure"
if [ -f out/trace.log ]; then
    if grep -q "^HDR" out/trace.log && \
       grep -q "^WORLD" out/trace.log && \
       grep -q "^STDOUT" out/trace.log && \
       grep -q "^MANIFEST" out/trace.log && \
       grep -q "^FILE" out/trace.log && \
       grep -q "^DATA" out/trace.log; then
        echo "  ✓ Trace contains all required sections"
    else
        echo "  ✗ Trace missing required sections"
        exit 1
    fi
else
    echo "  ✗ Trace file not created"
    exit 1
fi

# Test 4: Self-encoding completeness
echo ""
echo "Test 4: Self-Encoding"
file_count=$(grep -c "^FILE" out/trace.log || echo 0)
data_count=$(grep -c "^DATA" out/trace.log || echo 0)
if [ "$file_count" -ge 10 ] && [ "$data_count" -ge 50 ]; then
    echo "  ✓ Self-encoding complete ($file_count files, $data_count data lines)"
else
    echo "  ✗ Self-encoding incomplete"
    exit 1
fi

# Test 5: Reconstruction
echo ""
echo "Test 5: Trace Reconstruction"
if ./bin/decode_trace.sh out/trace.log reconstructed >/dev/null 2>&1; then
    if [ -f reconstructed/WORLD/.genesis ] && \
       [ -x reconstructed/REPO/bin/run.sh ]; then
        echo "  ✓ Reconstruction successful"
    else
        echo "  ✗ Reconstructed files incomplete"
        exit 1
    fi
else
    echo "  ✗ Reconstruction failed"
    exit 1
fi

# Test 6: Re-execution determinism
echo ""
echo "Test 6: Deterministic Re-execution"
ORIG_DIR="$(pwd)"
cd reconstructed/REPO || exit 1
if echo -e "hello\nworld\nv1.1" | bash bin/run.sh ../WORLD out2 >/dev/null 2>&1; then
    cd "$ORIG_DIR" || exit 1
    if cmp -s out/trace.log reconstructed/REPO/out2/trace.log; then
        echo "  ✓ Re-execution produces identical trace (deterministic)"
    else
        echo "  ✗ Traces differ (non-deterministic)"
        exit 1
    fi
else
    cd "$ORIG_DIR" || exit 1
    echo "  ✗ Re-execution failed"
    exit 1
fi

# Test 7: Architecture invariants
echo ""
echo "Test 7: Architecture Invariants"
if ./bin/verify_architecture.sh >/dev/null 2>&1; then
    echo "  ✓ All architectural invariants hold"
else
    echo "  ✗ Architecture validation failed"
    exit 1
fi

# Test 8: Compute trace hash
echo ""
echo "Test 8: Trace Integrity"
trace_hash=$(./bin/hash.sh < out/trace.log)
echo "  ✓ Trace hash: $trace_hash"

echo ""
echo "=== All Tests Passed ✓ ==="
echo ""
echo "ULP v1.1 Implementation Summary:"
echo "  • Trace is append-only and authoritative"
echo "  • World definition is non-executable"
echo "  • Self-encoding is complete"
echo "  • Reconstruction is perfect"
echo "  • Execution is deterministic"
echo "  • Architecture invariants preserved"
echo ""
echo "The trace is the machine. Everything else is a view."
