#!/bin/sh
set -eu

STORIES_DIR="out/stories"
PROJ_DIR="out/projections"

mkdir -p "$PROJ_DIR"/{svg,obj,gltf,ar}

echo "=== GENERATING MULTIMEDIA PROJECTIONS ==="
echo ""

for encoded in "$STORIES_DIR"/*_encoded.txt; do
    base=$(basename "$encoded" _encoded.txt)
    echo "Projecting: $base"

    # Generate SVG (2D)
    ./projections/story_to_svg.sh "$encoded" > "$PROJ_DIR/svg/${base}.svg" 2>/dev/null
    echo "  ✓ SVG: ${base}.svg"

    # Generate OBJ (3D)
    ./projections/story_to_obj.sh "$encoded" > "$PROJ_DIR/obj/${base}.obj" 2>/dev/null
    echo "  ✓ OBJ: ${base}.obj + ${base}.mtl"

    # Generate glTF (AR/VR)
    ./projections/story_to_glb.sh "$encoded" > "$PROJ_DIR/gltf/${base}.gltf" 2>/dev/null
    echo "  ✓ glTF: ${base}.gltf"

    # Generate AR HTML
    ./projections/story_to_ar_overlay.sh "$encoded" > "$PROJ_DIR/ar/${base}_ar.html" 2>/dev/null
    echo "  ✓ AR: ${base}_ar.html"

    echo ""
done

echo "=== PROJECTION SUMMARY ==="
echo "SVG (2D):     $(ls $PROJ_DIR/svg/*.svg | wc -l) files"
echo "OBJ (3D):     $(ls $PROJ_DIR/obj/*.obj | wc -l) files"
echo "glTF (AR/VR): $(ls $PROJ_DIR/gltf/*.gltf | wc -l) files"
echo "HTML (AR):    $(ls $PROJ_DIR/ar/*.html | wc -l) files"
echo ""
echo "Total projections: $(($(ls $PROJ_DIR/svg/*.svg | wc -l) * 4)) across 4 formats"
