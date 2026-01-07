#!/bin/sh
# bin/geometry.sh: table-driven geometry selection (v3.0)
# Usage: geometry.sh <E8L_hex> <E8R_hex>
# Output: JSON with projective, causality, incidence geometry

set -eu

E8L="${1:?missing E8L}"
E8R="${2:?missing E8R}"

# Extract byte[0] for geometry selection mix
E8L_BYTE0=$(echo "$E8L" | cut -c1-2)
E8R_BYTE0=$(echo "$E8R" | cut -c1-2)

# Compute mix = byte0(E8L) XOR byte0(E8R)
E8L_DEC=$(printf "%d" "0x$E8L_BYTE0")
E8R_DEC=$(printf "%d" "0x$E8R_BYTE0")
MIX=$((E8L_DEC ^ E8R_DEC))

# Extract byte[2] for causality/incidence selection
E8L_BYTE2=$(echo "$E8L" | cut -c5-6)
E8R_BYTE2=$(echo "$E8R" | cut -c5-6)
E8L_BYTE2_DEC=$(printf "%d" "0x$E8L_BYTE2")
E8R_BYTE2_DEC=$(printf "%d" "0x$E8R_BYTE2")

# Projective ladder choices (C family)
PROJECTIVE_CHOICES="LINE PLANE SPHERE SHAPE"
PROJECTIVE_COUNT=4
PROJ_IDX=$((MIX % PROJECTIVE_COUNT))
PROJECTIVE=$(echo $PROJECTIVE_CHOICES | awk -v idx=$PROJ_IDX '{print $(idx+1)}')

# Causality ladder choices (H family)
CAUSALITY_CHOICES="TETRA CUBE OCTA DODECA ICOSA"
CAUSALITY_COUNT=5
CAUS_IDX=$((E8L_BYTE2_DEC % CAUSALITY_COUNT))
CAUSALITY=$(echo $CAUSALITY_CHOICES | awk -v idx=$CAUS_IDX '{print $(idx+1)}')

# Incidence ladder choices (O family)
INCIDENCE_CHOICES="SIMPLEX5 CELL16 CELL24 CELL120 CELL600"
INCIDENCE_COUNT=5
INC_IDX=$((E8R_BYTE2_DEC % INCIDENCE_COUNT))
INCIDENCE=$(echo $INCIDENCE_CHOICES | awk -v idx=$INC_IDX '{print $(idx+1)}')

# Geometry sizes (for replica slot generation)
# These are the vertex/cell counts
case "$INCIDENCE" in
    SIMPLEX5) INC_SIZE=6 ;;
    CELL16)   INC_SIZE=16 ;;
    CELL24)   INC_SIZE=24 ;;
    CELL120)  INC_SIZE=120 ;;
    CELL600)  INC_SIZE=600 ;;
    *) INC_SIZE=24 ;;  # default
esac

# Output JSON
cat <<EOF
{
  "projective": "$PROJECTIVE",
  "causality": "$CAUSALITY",
  "incidence": "$INCIDENCE",
  "incidence_size": $INC_SIZE,
  "mix": $MIX
}
EOF
