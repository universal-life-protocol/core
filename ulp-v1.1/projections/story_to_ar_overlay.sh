#!/bin/sh
#===============================================================================
# projections/story_to_ar_overlay.sh - AR/VR Web Overlay
#===============================================================================
# Creates HTML+AR.js overlay for viewing story in augmented reality
set -eu

TRACE="${1:-/dev/stdin}"

cat << 'AR_HEADER'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Conversation at the Gate - AR Experience</title>
  <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/aframe/build/aframe-ar.js"></script>
  <style>
    body { margin: 0; overflow: hidden; font-family: serif; }
    #story-text {
      position: absolute;
      bottom: 0;
      width: 100%;
      background: rgba(0,0,0,0.8);
      color: #ffd700;
      padding: 20px;
      box-sizing: border-box;
      max-height: 30vh;
      overflow-y: auto;
    }
    .dialogue { font-style: italic; color: #fff; margin: 10px 0; }
    .character { color: #00d4ff; font-weight: bold; }
    #ar-instructions {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      background: rgba(0,0,0,0.7);
      color: #ffd700;
      padding: 15px;
      border-radius: 8px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="ar-instructions">
    📱 Point your camera at a flat surface to see the conversation unfold.<br>
    Tap characters to hear their dialogue.
  </div>

  <a-scene
    embedded
    arjs="sourceType: webcam; debugUIEnabled: false;"
    vr-mode-ui="enabled: false">

    <!-- Lighting -->
    <a-entity light="type: ambient; color: #BBB"></a-entity>
    <a-entity light="type: directional; color: #FFF; intensity: 0.6" position="-1 2 1"></a-entity>

AR_HEADER

# Extract characters and dialogues from trace
awk -F'\t' '
$1 == "STDOUT" && NF >= 5 {
    text = $5

    # Solomon
    if (text ~ /SOLOMON/ || text ~ /Solomon/) {
        if (!solomon_added) {
            print "    <!-- Solomon -->"
            print "    <a-box"
            print "      position=\"0 1.8 -3\""
            print "      rotation=\"0 0 0\""
            print "      color=\"#FFD700\""
            print "      scale=\"0.5 2 0.3\""
            print "      class=\"character\""
            print "      data-character=\"Solomon\""
            print "      event-set__enter=\"_event: mouseenter; scale: 0.6 2.2 0.35\""
            print "      event-set__leave=\"_event: mouseleave; scale: 0.5 2 0.3\">"
            print "      <a-text"
            print "        value=\"Solomon\""
            print "        align=\"center\""
            print "        color=\"#000\""
            print "        position=\"0 1.2 0.2\""
            print "        scale=\"0.8 0.8 0.8\"></a-text>"
            print "    </a-box>"
            solomon_added = 1
        }
    }

    # Solon
    if (text ~ /SOLON/ || text ~ /Solon/) {
        if (!solon_added) {
            print "    <!-- Solon -->"
            print "    <a-box"
            print "      position=\"2 1.7 -2.5\""
            print "      rotation=\"0 -30 0\""
            print "      color=\"#7777FF\""
            print "      scale=\"0.5 2 0.3\""
            print "      class=\"character\""
            print "      data-character=\"Solon\""
            print "      event-set__enter=\"_event: mouseenter; scale: 0.6 2.2 0.35\""
            print "      event-set__leave=\"_event: mouseleave; scale: 0.5 2 0.3\">"
            print "      <a-text"
            print "        value=\"Solon\""
            print "        align=\"center\""
            print "        color=\"#FFF\""
            print "        position=\"0 1.2 0.2\""
            print "        scale=\"0.8 0.8 0.8\"></a-text>"
            print "    </a-box>"
            solon_added = 1
        }
    }

    # Ibn Khaldun (Assabiyah)
    if (text ~ /Assabiyah/ || text ~ /ʿAsabiyyah/ || text ~ /Ibn/ || text ~ /Khaldun/) {
        if (!ibn_added) {
            print "    <!-- Ibn Khaldun -->"
            print "    <a-box"
            print "      position=\"-2 1.75 -2.5\""
            print "      rotation=\"0 30 0\""
            print "      color=\"#66CC66\""
            print "      scale=\"0.5 2 0.3\""
            print "      class=\"character\""
            print "      data-character=\"Ibn Khaldun\""
            print "      event-set__enter=\"_event: mouseenter; scale: 0.6 2.2 0.35\""
            print "      event-set__leave=\"_event: mouseleave; scale: 0.5 2 0.3\">"
            print "      <a-text"
            print "        value=\"Ibn Khaldun\""
            print "        align=\"center\""
            print "        color=\"#000\""
            print "        position=\"0 1.2 0.2\""
            print "        scale=\"0.7 0.7 0.7\"></a-text>"
            print "    </a-box>"
            ibn_added = 1
        }
    }

    # Store dialogues for text overlay
    if (text ~ /^>/) {
        dialogue_count++
        gsub(/^> /, "", text)
        gsub(/"/, "\\\"", text)
        dialogues[dialogue_count] = text
    }
}

END {
    # Add city gate
    print "    <!-- City Gate -->"
    print "    <a-box"
    print "      position=\"0 2 -5\""
    print "      rotation=\"0 0 0\""
    print "      color=\"#8B7355\""
    print "      scale=\"5 4 0.5\">"
    print "      <a-text"
    print "        value=\"Gate of the City\""
    print "        align=\"center\""
    print "        color=\"#FFD700\""
    print "        position=\"0 1 0.3\""
    print "        scale=\"1.5 1.5 1.5\"></a-text>"
    print "    </a-box>"

    # Add ground plane
    print "    <!-- Ground -->"
    print "    <a-plane"
    print "      position=\"0 0 -3\""
    print "      rotation=\"-90 0 0\""
    print "      width=\"10\""
    print "      height=\"10\""
    print "      color=\"#7BC8A4\""
    print "      shadow></a-plane>"

    # Add camera
    print "    <!-- Camera -->"
    print "    <a-camera></a-camera>"
    print "  </a-scene>"

    # Add story text overlay
    print "  <div id=\"story-text\">"
    print "    <h2 style=\"color:#ffd700; margin:0 0 10px 0;\">Solomon, Solon, and ʿAsabiyyah at the Gate</h2>"

    for (i = 1; i <= dialogue_count && i <= 3; i++) {
        print "    <p class=\"dialogue\">\"" dialogues[i] "\"</p>"
    }

    print "    <p style=\"color:#aaa; font-size:0.9em; margin-top:15px;\">"
    print "      Tap characters to explore their wisdom. Swipe text to read more."
    print "    </p>"
    print "  </div>"

    # Add interaction script
    print "  <script>"
    print "    // Character interaction"
    print "    document.querySelectorAll('.character').forEach(el => {"
    print "      el.addEventListener('click', () => {"
    print "        const char = el.getAttribute('data-character');"
    print "        console.log('Tapped:', char);"
    print "        // Could trigger audio playback or dialogue display"
    print "      });"
    print "    });"
    print "  </script>"
}
' "$TRACE"

cat << 'AR_FOOTER'
</body>
</html>
AR_FOOTER

echo "" >&2
echo "# AR Experience created!" >&2
echo "# Open in mobile browser to view in AR" >&2
echo "# Requires camera permissions" >&2
