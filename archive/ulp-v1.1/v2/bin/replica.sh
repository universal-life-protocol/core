#!/bin/sh
# bin/replica.sh: generate replica slot indices
# Usage: replica.sh <E8L_hex> <E8R_hex> <geometry_size>
# Output: JSON array of 9 slot indices

set -eu

E8L="${1:?missing E8L}"
E8R="${2:?missing E8R}"
GEOMETRY_SIZE="${3:?missing geometry size}"

# Generate 9 replica slots (constant per spec)
# Formula: slot_i = (byte(E8L,i)*257 + byte(E8R,i) + i) mod N

SLOTS="["

for i in $(seq 0 8); do
    # Extract byte i from E8L and E8R
    BYTE_POS=$((i * 2 + 1))

    # Handle wrapping if we run out of bytes (hash is 32 bytes = 64 hex chars)
    WRAPPED_POS=$((BYTE_POS % 64))
    if [ $WRAPPED_POS -eq 0 ]; then WRAPPED_POS=64; fi
    END_POS=$((WRAPPED_POS + 1))

    E8L_BYTE=$(echo "$E8L" | cut -c${WRAPPED_POS}-${END_POS})
    E8R_BYTE=$(echo "$E8R" | cut -c${WRAPPED_POS}-${END_POS})

    E8L_DEC=$(printf "%d" "0x$E8L_BYTE")
    E8R_DEC=$(printf "%d" "0x$E8R_BYTE")

    # Compute slot: (E8L[i]*257 + E8R[i] + i) mod N
    SLOT=$(( (E8L_DEC * 257 + E8R_DEC + i) % GEOMETRY_SIZE ))

    if [ $i -eq 0 ]; then
        SLOTS="${SLOTS}${SLOT}"
    else
        SLOTS="${SLOTS}, ${SLOT}"
    fi
done

SLOTS="${SLOTS}]"

# Output JSON
cat <<EOF
{
  "slots": $SLOTS,
  "count": 9,
  "geometry_size": $GEOMETRY_SIZE
}
EOF
