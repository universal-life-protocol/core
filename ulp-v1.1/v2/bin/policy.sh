#!/bin/sh
# bin/policy.sh: derive E8×E8 policy from RID
# Usage: policy.sh <RID_hex>
# Output: JSON with E8L, E8R, chirality

set -eu

RID_HEX="${1:?missing RID}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Derive E8L = sha256("E8L" || RID)
# Note: We hash the string representation, not the binary
E8L=$(printf "E8L%s" "$RID_HEX" | "$SCRIPT_DIR/hash.sh")

# Derive E8R = sha256("E8R" || RID)
E8R=$(printf "E8R%s" "$RID_HEX" | "$SCRIPT_DIR/hash.sh")

# Extract byte[1] from each seed
E8L_BYTE1=$(echo "$E8L" | cut -c3-4)
E8R_BYTE1=$(echo "$E8R" | cut -c3-4)

# Compute chirality: (byte1(E8L) XOR byte1(E8R)) & 1
# Use printf to convert hex to decimal
E8L_DEC=$(printf "%d" "0x$E8L_BYTE1")
E8R_DEC=$(printf "%d" "0x$E8R_BYTE1")
XOR=$((E8L_DEC ^ E8R_DEC))
CHIRALITY_BIT=$((XOR & 1))

if [ "$CHIRALITY_BIT" -eq 0 ]; then
    CHIRALITY="LEFT"
else
    CHIRALITY="RIGHT"
fi

# Output JSON
cat <<EOF
{
  "E8L": "$E8L",
  "E8R": "$E8R",
  "chirality": "$CHIRALITY",
  "chirality_bit": $CHIRALITY_BIT
}
EOF
