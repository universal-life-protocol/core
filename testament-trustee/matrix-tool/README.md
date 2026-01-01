# Rumsfeld Matrix Tool

Interactive web-based tool for mapping theological understanding using the Rumsfeld epistemological matrix.

## Features

- **Four Quadrants**: Known Knowns, Known Unknowns, Unknown Knowns, Unknown Unknowns
- **Drag & Drop**: Move statements between quadrants as understanding evolves
- **Event Logging**: Every action is logged (add, move, delete)
- **ULP Trace Export**: Generate v1.1 compatible traces
- **Local Storage**: Save and load sessions
- **Keyboard Shortcuts**: Ctrl+S (save), Ctrl+E (export)

## Usage

### During Conversation

1. **Open** `index.html` in a web browser
2. **Enter** participant name and date
3. **Add statements** as the conversation progresses
4. **Drag between quadrants** when understanding shifts
5. **Export trace** at the end

### Keyboard Shortcuts

- `Enter` in input field → Add statement
- `Ctrl+S` → Save locally
- `Ctrl+E` → Export trace

## The Four Quadrants

### Known Knowns (Green)
**What I know that I know about God**

Examples:
- "God is love" (from scripture)
- "I pray daily" (personal practice)
- "Church community matters" (lived experience)

### Known Unknowns (Blue)
**What I know that I don't know about God**

Examples:
- "Why does suffering exist?"
- "What happens after death?"
- "Is there a divine plan?"

### Unknown Knowns (Orange)
**What I know but can't articulate about God**

Examples:
- "I feel peace in prayer but don't know why"
- "I act morally without conscious belief"
- "I sense presence but can't describe it"

*This is the hardest quadrant to populate - it requires introspection.*

### Unknown Unknowns (Purple)
**What I don't know that I don't know about God**

This quadrant is intentionally left empty for speculation and mystery. It represents:
- The limits of human knowledge
- Space for humility
- What only God can know

## Trace Format

Exported traces are ULP v1.1 compatible JSON:

```json
{
  "version": "1.1",
  "type": "theological-testimony",
  "created": "2025-01-01T12:00:00.000Z",
  "metadata": {
    "participant": "Jane Doe",
    "sessionId": "testimony-1735732800000-abc123",
    "date": "2025-01-01",
    "framework": "rumsfeld-matrix",
    "speaker": "Speaker for the Unknowable"
  },
  "matrix": {
    "known-knowns": [
      {
        "text": "God is love",
        "timestamp": "2025-01-01T12:15:00.000Z"
      }
    ],
    "known-unknowns": [
      {
        "text": "Why does suffering exist?",
        "timestamp": "2025-01-01T12:30:00.000Z"
      }
    ],
    "unknown-knowns": [
      {
        "text": "I feel peace but can't explain why",
        "timestamp": "2025-01-01T12:45:00.000Z"
      }
    ],
    "unknown-unknowns": {
      "note": "Space reserved for mystery and the unknowable",
      "speculation": null
    }
  },
  "events": [
    {
      "timestamp": 1735732800000,
      "iso": "2025-01-01T12:00:00.000Z",
      "type": "SESSION_START",
      "data": { "sessionId": "testimony-..." }
    },
    {
      "timestamp": 1735733700000,
      "iso": "2025-01-01T12:15:00.000Z",
      "type": "ADD_STATEMENT",
      "data": {
        "quadrant": "known-knowns",
        "text": "God is love"
      }
    }
  ],
  "hash": "a1b2c3d4"
}
```

## Integration with ULP

The matrix tool generates traces that can be:

1. **Archived** as permanent theological records
2. **Queried** alongside other testimonies
3. **Projected** into different views (timeline, 3D scene, AR)
4. **Verified** cryptographically (hash prevents tampering)

## Local Development

Simply open `index.html` in any modern browser. No build process required.

```bash
# From testament-trustee/matrix-tool/
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows
```

## Deployment

Copy the entire `matrix-tool/` directory to a web server or GitHub Pages.

## Privacy & Ethics

- **No automatic upload** - all data stays local until user exports
- **Explicit consent** - designed for in-person facilitated conversations
- **Immutable traces** - once exported, can't be edited (only clarified via append)
- **Participant control** - they receive their trace hash as proof

## Use Cases

### Facilitated Conversations
Moderator uses projector/large screen showing matrix. Participant watches it fill as they speak.

### Self-Reflection
Individual fills out matrix privately, exports for personal record.

### Group Discussions
Multiple participants compare their matrices, find commonalities/differences.

### Longitudinal Studies
Same person fills out matrix at different life stages, tracks evolution.

## Future Enhancements

- [ ] Real-time P2P sync (multiple participants simultaneously)
- [ ] Video recording integration
- [ ] Voice transcription (auto-add statements)
- [ ] Visual export (SVG/PNG of matrix)
- [ ] Timeline view of statement movements
- [ ] Statistical analysis across multiple traces
- [ ] Integration with Conversation Studio (3D visualization)

## Related

- [Testament Trustee Main README](../README.md)
- [ULP v1.1 Specification](../../Final%20README.md)
- [Conversation Studio](../../docs/studio.html)
