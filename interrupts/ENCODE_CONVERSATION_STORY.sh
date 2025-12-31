#!/bin/sh
#===============================================================================
# interrupts/ENCODE_CONVERSATION_STORY.sh
# Encodes Conversation Series articles as multimedia story traces
#===============================================================================
set -eu

ARTICLE_PATH="${1:-../Conversation Series/ARTICLE I.md}"

# Read article and encode as structured story data
if [ -f "$ARTICLE_PATH" ]; then
    cat "$ARTICLE_PATH"
else
    # If no article provided, encode from stdin
    cat
fi | awk '
BEGIN {
    scene = 0
    in_dialogue = 0
}

# Extract title
/^#.*Solomon.*Solon.*ʿAsabiyyah/ {
    print "[STORY:TITLE]"
    print $0
    print "[/STORY:TITLE]"
    print ""
}

# Extract prologue as scene 0
/^## Prologue/ {
    scene = 0
    print "[SCENE:" scene "]"
    print "[SCENE:NAME] Prologue - After the Word"
    print "[SCENE:LOCATION] The Gate of the City"
    print "[SCENE:TIME] After the Revelation"
    print "[SCENE:CHARACTERS]"
    print "- Narrator"
    print "[/SCENE:CHARACTERS]"
    print "[SCENE:NARRATION]"
    next
}

# Extract main sections as scenes
/^## I\. Solomon/ {
    if (scene > 0) print "[/SCENE:NARRATION]\n[/SCENE]\n"
    scene = 1
    print "[SCENE:" scene "]"
    print "[SCENE:NAME] Solomon Speaks - The Weight of Wisdom"
    print "[SCENE:LOCATION] The Gate of the City"
    print "[SCENE:CHARACTER] Solomon"
    print "[SCENE:3D_POSITION] Solomon: (0, 1.8, -3) facing_forward"
    print "[SCENE:NARRATION]"
    next
}

/^## II\. Solon/ {
    if (scene > 0) print "[/SCENE:NARRATION]\n[/SCENE]\n"
    scene = 2
    print "[SCENE:" scene "]"
    print "[SCENE:NAME] Solon Speaks - The Practice of Laws"
    print "[SCENE:LOCATION] The Gate of the City"
    print "[SCENE:CHARACTER] Solon"
    print "[SCENE:3D_POSITION] Solon: (2, 1.7, -2.5) facing_left"
    print "[SCENE:NARRATION]"
    next
}

/^## III.*ʿAsabiyyah/ || /Assabiyah/ {
    if (scene > 0) print "[/SCENE:NARRATION]\n[/SCENE]\n"
    scene = 3
    print "[SCENE:" scene "]"
    print "[SCENE:NAME] The Voice of ʿAsabiyyah - Social Cohesion"
    print "[SCENE:LOCATION] The Gate of the City"
    print "[SCENE:CHARACTER] Ibn Khaldun (representing ʿAsabiyyah)"
    print "[SCENE:3D_POSITION] Ibn_Khaldun: (-2, 1.75, -2.5) facing_right"
    print "[SCENE:NARRATION]"
    next
}

# Mark dialogue sections
/^> / {
    if (!in_dialogue) {
        print "[DIALOGUE]"
        in_dialogue = 1
    }
    gsub(/^> /, "")
    print "  " $0
    next
}

# End dialogue on blank line after dialogue
in_dialogue && /^$/ {
    print "[/DIALOGUE]"
    in_dialogue = 0
    next
}

# Regular narration
!/^#/ && !/^---/ && NF > 0 {
    print $0
}

END {
    if (in_dialogue) print "[/DIALOGUE]"
    if (scene > 0) print "[/SCENE:NARRATION]\n[/SCENE]"

    # Add multimedia metadata
    print ""
    print "[MULTIMEDIA:METADATA]"
    print "[AUDIO:AMBIENT] ancient_city_atmosphere.wav"
    print "[AUDIO:MUSIC] wisdom_theme.wav"
    print "[3D:ENVIRONMENT] jerusalem_gate.glb"
    print "[AR:MARKER] conversation_gate_qr.svg"
    print "[VR:SCENE] three_voices.glb"
    print "[/MULTIMEDIA:METADATA]"

    # Add projection hints
    print ""
    print "[PROJECTION:HINTS]"
    print "SVG: Generate 2D scene with three figures at gate"
    print "OBJ/MTL: Position characters at specified 3D coordinates"
    print "GLB: Bundle complete scene for AR/VR viewing"
    print "MP4: Animate dialogue sequence with camera movements"
    print "WAV: Layer ambient sound with narration and dialogue"
    print "HTML+AR: Web-based AR overlay at physical gate locations"
    print "[/PROJECTION:HINTS]"
}
'
