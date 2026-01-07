#!/bin/sh
# validate.sh - ULP System Validation

set -eu

echo "=== ULP System Validation ==="
echo

check() {
    if eval "$2"; then
        echo "✓ $1"
        return 0
    else
        echo "✗ $1"
        return 1
    fi
}

# Test execution
echo "Running tests..."
echo

check "World dotfiles exist" 'test -f world/.genesis && test -f world/.procedure'

check "Interrupt handler exists" 'test -x interrupts/PRINT.sh'

check "Core utilities exist" 'test -x bin/run.sh && test -x bin/hash.sh'

check ".procedure contains Pattern_Syntax" 'grep -q "[[()]" world/.procedure 2>/dev/null'

check "Multiset validation in proc.awk" 'grep -q "multiset_key" bin/proc.awk'

check "Trace exists and contains execution records" '
test -f out/trace.log && grep -q "^HDR" out/trace.log && grep -q "^STDOUT" out/trace.log
'

check "Trace contains self-encoding (MANIFEST)" 'grep -q "^MANIFEST" out/trace.log'

check "Trace contains FILE records" 'test $(grep -c "^FILE" out/trace.log) -ge 20'

check "Trace contains DATA records" 'test $(grep -c "^DATA" out/trace.log) -ge 100'

check "Reconstruction successful" 'test -f reconstructed/WORLD/.genesis'

check "Reconstructed files are executable" 'test -x reconstructed/REPO/bin/run.sh'

check "Re-execution produced trace" 'test -f reconstructed/REPO/out2/trace.log'

check "Determinism: byte-for-byte identical traces" '
cmp -s out/trace.log reconstructed/REPO/out2/trace.log
'

echo
echo "=== Validation Complete ==="
echo
echo "✓ All tests passed!"
echo
echo "The ULP system successfully demonstrates:"
echo "  1. Self-encoding: trace contains complete program"
echo "  2. Determinism: same inputs → same trace"
echo "  3. Reproducibility: trace → program → same trace"
echo "  4. Pattern_Syntax: .procedure uses delimiters"
echo "  5. Multiset validation: opening/closing signatures match"
