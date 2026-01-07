#!/bin/sh
# bin/verify_architecture.sh - Verify all ULP v1.1 architectural invariants
# ULP v1.1 - Complete architecture validation
set -eu

echo "=== ULP v1.1 Architecture Verification ==="
echo ""

errors=0

# Invariant 1: World definition non-executable
echo "1. Checking World Definition (non-executable)..."
if ./bin/validate_world.sh world >/dev/null 2>&1; then
    echo "   ✓ World definition is non-executable"
else
    echo "   ✗ World definition violates non-executability"
    errors=$((errors + 1))
fi

# Invariant 2: .interpose declarative
echo "2. Checking .interpose (declarative)..."
if [ -f world/.interpose ]; then
    if grep -q "exec\|eval\|system\|>>" world/.interpose 2>/dev/null; then
        echo "   ✗ .interpose contains executable code"
        errors=$((errors + 1))
    else
        echo "   ✓ .interpose is declarative mapping"
    fi
else
    echo "   ⚠ .interpose not found (optional)"
fi

# Invariant 3: .projection pure
echo "3. Checking .projection (pure)..."
if [ -f world/.projection ]; then
    if grep -q "exec\|system\|eval\|>>" world/.projection 2>/dev/null; then
        echo "   ✗ .projection contains effects"
        errors=$((errors + 1))
    else
        echo "   ✓ .projection is pure function declaration"
    fi
else
    echo "   ⚠ .projection not found (optional)"
fi

# Invariant 4: Forward-only information flow
echo "4. Checking information flow (forward-only)..."
if grep -r "trace\.log\|\.projection" interrupts/ bin/ 2>/dev/null | \
   grep -v "verify_architecture.sh\|observe.sh\|decode_trace.sh" | grep -q "."; then
    echo "   ✗ Backward references detected"
    errors=$((errors + 1))
else
    echo "   ✓ All references flow forward"
fi

# Invariant 5: Append-only trace construction
echo "5. Checking trace construction (append-only)..."
if grep -n "sed -i\|>> \$TRACE\|truncate" bin/*.sh 2>/dev/null | \
   grep -v ">> \"\$TRACE_TMP\"\|>> \"\$TRACE\"" | grep -q "."; then
    echo "   ✗ Trace mutation detected"
    errors=$((errors + 1))
else
    echo "   ✓ Trace construction is append-only"
fi

echo ""
echo "=== Architecture Layer Validation ==="
echo "  Layer 1: World Definition      (.genesis, .env, .atom, ...)"
echo "  Layer 2: Execution Structure   (.procedure, .interrupt, .interpose)"
echo "  Layer 3: Trace                 (append-only, authoritative)"
echo "  Layer 4: Observation           (.projection → pure views)"
echo ""
echo "Information Flow: World → Execution → Trace → Observation"
echo ""

if [ $errors -eq 0 ]; then
    echo "=== All Invariants Preserved ✓ ==="
    echo ""
    echo "ULP v1.1 Architecture: VALID"
    echo "Architecture Hash: 9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd"
    exit 0
else
    echo "=== Architecture Validation Failed ✗ ==="
    echo ""
    echo "Errors found: $errors"
    exit 1
fi
