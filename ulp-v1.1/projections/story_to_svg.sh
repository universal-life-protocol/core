#!/bin/sh
#===============================================================================
# projections/story_to_svg.sh - Story to SVG 2D Illustration
#===============================================================================
# Converts ULP story trace to SVG illustration with scenes
set -eu

TRACE="${1:-/dev/stdin}"

cat << 'SVG_HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <style>
      .scene-bg { fill: #2d1810; }
      .character { fill: #8b6914; stroke: #000; stroke-width: 2; }
      .throne { fill: #ffd700; stroke: #8b6914; stroke-width: 3; }
      .text { fill: #fff; font-family: serif; font-size: 14px; }
      .title { fill: #ffd700; font-family: serif; font-size: 24px; font-weight: bold; }
    </style>
  </defs>

  <!-- Background -->
  <rect class="scene-bg" width="800" height="600"/>

  <!-- Temple pillars -->
  <rect x="50" y="100" width="40" height="400" fill="#8b7355"/>
  <rect x="710" y="100" width="40" height="400" fill="#8b7355"/>

SVG_HEADER

# Extract story content and generate scene elements
awk -F'\t' '
$1 == "STDOUT" && NF >= 5 {
    text = $5

    # Extract title
    if (text ~ /SCENE:/) {
        match(text, /SCENE: ([^\n]+)/, arr)
        if (arr[1]) {
            print "  <!-- Title -->"
            print "  <text class=\"title\" x=\"400\" y=\"50\" text-anchor=\"middle\">" arr[1] "</text>"
        }
    }

    # Solomon on throne
    if (text ~ /SOLOMON/) {
        if (!solomon_drawn) {
            print "  <!-- Solomon -->"
            print "  <rect class=\"throne\" x=\"350\" y=\"200\" width=\"100\" height=\"120\" rx=\"10\"/>"
            print "  <circle class=\"character\" cx=\"400\" cy=\"240\" r=\"30\"/>"
            print "  <text class=\"text\" x=\"400\" y=\"350\" text-anchor=\"middle\">King Solomon</text>"
            solomon_drawn = 1
        }
    }

    # Two women
    if (text ~ /WOMAN/) {
        if (!women_drawn) {
            print "  <!-- Women -->"
            print "  <circle class=\"character\" cx=\"250\" cy=\"400\" r=\"25\"/>"
            print "  <text class=\"text\" x=\"250\" y=\"450\" text-anchor=\"middle\">Mother 1</text>"
            print "  <circle class=\"character\" cx=\"550\" cy=\"400\" r=\"25\"/>"
            print "  <text class=\"text\" x=\"550\" y=\"450\" text-anchor=\"middle\">Mother 2</text>"
            women_drawn = 1
        }
    }

    # Sword
    if (text ~ /sword/) {
        if (!sword_drawn) {
            print "  <!-- Sword -->"
            print "  <line x1=\"480\" y1=\"300\" x2=\"520\" y2=\"360\" stroke=\"#c0c0c0\" stroke-width=\"4\"/>"
            print "  <polygon points=\"520,360 525,365 515,365\" fill=\"#c0c0c0\"/>"
            sword_drawn = 1
        }
    }

    # Child
    if (text ~ /child/ || text ~ /Child/) {
        if (!child_drawn) {
            print "  <!-- Child -->"
            print "  <circle class=\"character\" cx=\"400\" cy=\"450\" r=\"15\" fill=\"#ffb6c1\"/>"
            child_drawn = 1
        }
    }
}

END {
    print "  "
    print "  <!-- Wisdom text -->"
    print "  <text class=\"text\" x=\"400\" y=\"550\" text-anchor=\"middle\" font-style=\"italic\">"
    print "    \"True wisdom sees what others conceal\""
    print "  </text>"
}
' "$TRACE"

cat << 'SVG_FOOTER'
</svg>
SVG_FOOTER
