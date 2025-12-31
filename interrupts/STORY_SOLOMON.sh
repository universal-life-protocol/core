#!/bin/sh
# interrupts/STORY_SOLOMON.sh - Solomon's Wisdom Story
# Multi-format narrative encoding demonstration

cat << 'STORY'
SCENE: The Judgment of Solomon
LOCATION: Temple of Jerusalem, 10th Century BCE

[NARRATION]
Two women stand before King Solomon, each claiming to be the mother of a living child. A dead child lies nearby. The throne room is filled with onlookers.

WOMAN_1: "My lord, this child is mine! She stole him while I slept!"
WOMAN_2: "No! The living child is mine. Hers died in the night."

SOLOMON: (stroking beard thoughtfully)
"Bring me a sword."

[SCENE: Guard brings sword]

SOLOMON: "Cut the living child in two. Give half to one, half to the other."

WOMAN_1: "Yes, divide him. Neither of us shall have him!"
WOMAN_2: (crying out) "No! Give her the child. Let him live!"

SOLOMON: (standing, pointing to Woman_2)
"Give the living child to her. She is the true mother."

[LESSON]
True love reveals itself through sacrifice.
Wisdom sees what others conceal.
Justice requires understanding the human heart.

[METADATA:SCENE_STRUCTURE]
- Characters: Solomon, Mother_True, Mother_False, Guards, Crowd
- Objects: Throne, Sword, Child_Living, Child_Dead
- Location: Temple_Interior, Jerusalem
- Time: Morning, Judgment_Hour
- Theme: Wisdom, Justice, Maternal_Love

[METADATA:3D_POSITIONS]
Solomon: (0, 2, -5) facing (0, 0, 0)
Mother_True: (-2, 0, 0) facing Solomon
Mother_False: (2, 0, 0) facing Solomon
Child: (0, 0, -1)
Guard: (3, 0, -3)
Crowd: distributed (5-10, 0, -8)

[METADATA:AUDIO_CUES]
00:00 - Ambient: Temple atmosphere, crowd murmur
00:05 - Woman_1: Angry accusation
00:10 - Woman_2: Defensive plea
00:15 - Solomon: Calm command "Bring me a sword"
00:20 - Sound: Sword being drawn
00:25 - Solomon: "Cut the child in two"
00:27 - Woman_1: Cold agreement
00:28 - Woman_2: Desperate cry "No!"
00:32 - Solomon: Final judgment
00:35 - Crowd: Gasps of amazement

[METADATA:VISUAL_KEYFRAMES]
Frame_0: Wide shot - Throne room
Frame_1: Close - Two women arguing
Frame_2: Medium - Solomon listening
Frame_3: Close - Solomon's eyes (wisdom)
Frame_4: Wide - Guard with sword
Frame_5: Close - True mother's face (horror)
Frame_6: Close - False mother's face (cold)
Frame_7: Wide - Solomon standing, pointing
Frame_8: Close - Child given to true mother
STORY
