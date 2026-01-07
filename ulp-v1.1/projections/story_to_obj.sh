#!/bin/sh
#===============================================================================
# projections/story_to_obj.sh - Story to 3D OBJ Model
#===============================================================================
# Converts story trace to Wavefront OBJ 3D scene
set -eu

TRACE="${1:-/dev/stdin}"

cat << 'OBJ_HEADER'
# ULP Story - 3D Scene (Wavefront OBJ)
# Generated from story trace
mtllib solomon.mtl

OBJ_HEADER

# Parse story and extract 3D positions
awk -F'\t' '
$1 == "STDOUT" && NF >= 5 {
    text = $5

    # Extract 3D positions from metadata
    if (text ~ /\[METADATA:3D_POSITIONS\]/) {
        in_3d_section = 1
        next
    }

    if (in_3d_section && text ~ /Solomon:/) {
        # Solomon throne at (0, 2, -5)
        print "# Solomon (throne)"
        print "o Solomon_Throne"
        print "v 0.0 2.0 -5.0"
        print "v 1.0 2.0 -5.0"
        print "v 1.0 3.5 -5.0"
        print "v 0.0 3.5 -5.0"
        print "v 0.0 2.0 -4.0"
        print "v 1.0 2.0 -4.0"
        print "v 1.0 3.5 -4.0"
        print "v 0.0 3.5 -4.0"
        print "f 1 2 3 4"
        print "f 5 6 7 8"
        print "f 1 2 6 5"
        print "f 2 3 7 6"
        print "f 3 4 8 7"
        print "f 4 1 5 8"
    }

    if (in_3d_section && text ~ /Mother_True:/) {
        # Mother at (-2, 0, 0)
        print "# Mother (true)"
        print "o Mother_True"
        print "v -2.0 0.0 0.0"
        print "v -1.5 0.0 0.0"
        print "v -1.5 1.7 0.0"
        print "v -2.0 1.7 0.0"
        print "f 9 10 11 12"
    }

    if (in_3d_section && text ~ /Mother_False:/) {
        # Mother at (2, 0, 0)
        print "# Mother (false)"
        print "o Mother_False"
        print "v 2.0 0.0 0.0"
        print "v 2.5 0.0 0.0"
        print "v 2.5 1.7 0.0"
        print "v 2.0 1.7 0.0"
        print "f 13 14 15 16"
    }

    if (in_3d_section && text ~ /Child:/) {
        # Child at (0, 0, -1)
        print "# Child"
        print "o Child"
        print "v 0.0 0.0 -1.0"
        print "v 0.3 0.0 -1.0"
        print "v 0.3 0.8 -1.0"
        print "v 0.0 0.8 -1.0"
        print "f 17 18 19 20"
    }

    if (in_3d_section && text ~ /Guard:/) {
        # Guard at (3, 0, -3)
        print "# Guard"
        print "o Guard"
        print "v 3.0 0.0 -3.0"
        print "v 3.5 0.0 -3.0"
        print "v 3.5 1.9 -3.0"
        print "v 3.0 1.9 -3.0"
        print "f 21 22 23 24"
    }

    # Exit 3D section
    if (in_3d_section && text ~ /^\[METADATA/) {
        in_3d_section = 0
    }
}

END {
    print "# End of OBJ"
}
' "$TRACE"

# Also generate MTL file
cat > solomon.mtl << 'MTL'
# ULP Story Materials
newmtl Solomon_Gold
Ka 1.0 0.84 0.0
Kd 1.0 0.84 0.0
Ks 1.0 1.0 0.5
Ns 100.0

newmtl Character_Skin
Ka 0.8 0.6 0.4
Kd 0.8 0.6 0.4
Ks 0.3 0.3 0.3
Ns 50.0

newmtl Guard_Armor
Ka 0.5 0.5 0.5
Kd 0.7 0.7 0.7
Ks 0.9 0.9 0.9
Ns 200.0
MTL
