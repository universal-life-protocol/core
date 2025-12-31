#!/bin/sh
#===============================================================================
# projections/story_to_glb.sh - Story to GLB (AR/VR Ready)
#===============================================================================
# Converts story trace to glTF binary format for AR/VR
set -eu

TRACE="${1:-/dev/stdin}"

# GLB is binary format - generate glTF JSON that can be converted
cat << 'GLB_HEADER'
{
  "asset": {
    "version": "2.0",
    "generator": "ULP Story Projection v1.1",
    "copyright": "Universal Life Protocol"
  },
  "scene": 0,
  "scenes": [
    {
      "name": "Conversation at the Gate",
      "nodes": [0, 1, 2, 3, 4]
    }
  ],
  "nodes": [
GLB_HEADER

awk -F'\t' '
BEGIN {
    solomon_pos = "0,1.8,-3"
    solon_pos = "2,1.7,-2.5"
    ibn_khaldun_pos = "-2,1.75,-2.5"
    gate_pos = "0,0,-5"
}

$1 == "STDOUT" && NF >= 5 {
    text = $5

    # Extract 3D positions if specified
    if (text ~ /Solomon:.*\(/) {
        match(text, /\(([^)]+)\)/, pos)
        if (pos[1]) solomon_pos = pos[1]
    }
    if (text ~ /Solon:.*\(/) {
        match(text, /\(([^)]+)\)/, pos)
        if (pos[1]) solon_pos = pos[1]
    }
    if (text ~ /Ibn_Khaldun:.*\(/) {
        match(text, /\(([^)]+)\)/, pos)
        if (pos[1]) ibn_khaldun_pos = pos[1]
    }
}

END {
    # Node 0: Solomon
    print "    {"
    print "      \"name\": \"Solomon\","
    print "      \"translation\": [" solomon_pos "],"
    print "      \"mesh\": 0"
    print "    },"

    # Node 1: Solon
    print "    {"
    print "      \"name\": \"Solon\","
    print "      \"translation\": [" solon_pos "],"
    print "      \"mesh\": 1"
    print "    },"

    # Node 2: Ibn Khaldun
    print "    {"
    print "      \"name\": \"Ibn Khaldun\","
    print "      \"translation\": [" ibn_khaldun_pos "],"
    print "      \"mesh\": 2"
    print "    },"

    # Node 3: Gate
    print "    {"
    print "      \"name\": \"City Gate\","
    print "      \"translation\": [" gate_pos "],"
    print "      \"mesh\": 3"
    print "    },"

    # Node 4: Ground plane
    print "    {"
    print "      \"name\": \"Ground\","
    print "      \"translation\": [0, 0, 0],"
    print "      \"mesh\": 4"
    print "    }"
}
' "$TRACE"

cat << 'GLB_FOOTER'
  ],
  "meshes": [
    {
      "name": "Solomon_Figure",
      "primitives": [{
        "attributes": {"POSITION": 0},
        "material": 0
      }]
    },
    {
      "name": "Solon_Figure",
      "primitives": [{
        "attributes": {"POSITION": 1},
        "material": 1
      }]
    },
    {
      "name": "IbnKhaldun_Figure",
      "primitives": [{
        "attributes": {"POSITION": 2},
        "material": 2
      }]
    },
    {
      "name": "City_Gate",
      "primitives": [{
        "attributes": {"POSITION": 3},
        "material": 3
      }]
    },
    {
      "name": "Ground_Plane",
      "primitives": [{
        "attributes": {"POSITION": 4},
        "material": 4
      }]
    }
  ],
  "materials": [
    {
      "name": "Solomon_Material",
      "pbrMetallicRoughness": {
        "baseColorFactor": [1.0, 0.84, 0.0, 1.0],
        "metallicFactor": 0.5,
        "roughnessFactor": 0.5
      }
    },
    {
      "name": "Solon_Material",
      "pbrMetallicRoughness": {
        "baseColorFactor": [0.7, 0.7, 1.0, 1.0],
        "metallicFactor": 0.3,
        "roughnessFactor": 0.7
      }
    },
    {
      "name": "IbnKhaldun_Material",
      "pbrMetallicRoughness": {
        "baseColorFactor": [0.6, 0.8, 0.6, 1.0],
        "metallicFactor": 0.4,
        "roughnessFactor": 0.6
      }
    },
    {
      "name": "Gate_Material",
      "pbrMetallicRoughness": {
        "baseColorFactor": [0.6, 0.5, 0.4, 1.0],
        "metallicFactor": 0.1,
        "roughnessFactor": 0.9
      }
    },
    {
      "name": "Ground_Material",
      "pbrMetallicRoughness": {
        "baseColorFactor": [0.5, 0.4, 0.3, 1.0],
        "metallicFactor": 0.0,
        "roughnessFactor": 1.0
      }
    }
  ]
}
GLB_FOOTER

echo "" >&2
echo "# To convert to binary GLB:" >&2
echo "# Use: gltf-pipeline -i output.gltf -o output.glb" >&2
echo "# Or view directly in AR/VR viewers that support glTF" >&2
