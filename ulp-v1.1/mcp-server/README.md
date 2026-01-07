# ULP Conversation Studio MCP Server

Model Context Protocol (MCP) server for programmatic control of the Universal Life Protocol Conversation Studio. Enables AI assistants and other tools to create, manipulate, and export 3D scenes through RPC.

## Features

- **Scene Management**: Create and manage multiple 3D scenes
- **Object Manipulation**: Add characters, primitives, and environment elements
- **Transform Controls**: Move, rotate, and scale objects
- **Trace Export/Import**: Full ULP v1.1 trace compatibility
- **Template Resources**: Pre-built scene templates
- **URL Generation**: Direct links to view scenes in the web studio

## Installation

```bash
cd mcp-server
npm install
```

## Usage

### Running the Server

```bash
npm start
```

The server uses stdio transport and can be integrated with MCP-compatible clients.

### Configuration with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ulp-studio": {
      "command": "node",
      "args": ["/path/to/ulp-v1.1/mcp-server/index.js"]
    }
  }
}
```

### Configuration with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node /path/to/mcp-server/index.js
```

## Available Tools

### Scene Management

#### `create_scene`
Create a new 3D scene.

```json
{
  "id": "my-scene",
  "title": "My First Scene",
  "description": "A dialogue between the three thinkers"
}
```

#### `list_scenes`
List all scenes currently in memory.

```json
{}
```

### Object Manipulation

#### `add_character`
Add a character to the scene.

**Characters:**
- `solomon` - Solomon (wisdom, golden box)
- `solon` - Solon (law, blue box)
- `ibn` - Ibn Khaldun (social cohesion, green box)

```json
{
  "character": "solomon",
  "x": -3,
  "y": 0,
  "z": -3,
  "sceneId": "my-scene"
}
```

#### `add_object`
Add a primitive or environment element.

**Object Types:**
- Primitives: `box`, `sphere`, `cylinder`, `plane`
- Environment: `gate`, `ground`, `light`, `text`

```json
{
  "type": "sphere",
  "x": 0,
  "y": 1.5,
  "z": -5,
  "color": "#FF0000",
  "sceneId": "my-scene"
}
```

#### `move_object`
Transform an object's position, rotation, or scale.

```json
{
  "objectId": "obj-1234567890",
  "x": 5,
  "y": 2,
  "z": -3,
  "rotationY": 45,
  "scale": 1.5,
  "sceneId": "my-scene"
}
```

#### `delete_object`
Remove an object from the scene.

```json
{
  "objectId": "obj-1234567890",
  "sceneId": "my-scene"
}
```

#### `list_objects`
List all objects in a scene.

```json
{
  "sceneId": "my-scene"
}
```

### Trace Operations

#### `export_trace`
Export scene as ULP v1.1 trace JSON.

```json
{
  "sceneId": "my-scene"
}
```

Returns:
```json
{
  "version": "1.1",
  "created": "2025-01-01T00:00:00.000Z",
  "metadata": { "title": "My First Scene" },
  "scene": [
    {
      "id": "obj-1234567890",
      "type": "solomon",
      "position": { "x": -3, "y": 0, "z": -3 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 }
    }
  ],
  "events": []
}
```

#### `import_trace`
Import a scene from ULP trace JSON.

```json
{
  "trace": {
    "version": "1.1",
    "scene": [...],
    "events": [...]
  }
}
```

#### `generate_studio_url`
Generate a URL to view the scene in the web interface.

```json
{
  "sceneId": "my-scene"
}
```

Returns:
```json
{
  "success": true,
  "url": "https://universal-life-protocol.github.io/core/docs/studio.html#trace=...",
  "message": "Open this URL in a browser to view the scene"
}
```

## Available Resources

Resources provide pre-built scene templates:

### `ulp://templates/dialogue-scene`
Three-way dialogue setup with Solomon, Solon, and Ibn Khaldun positioned in a conversation triangle.

### `ulp://templates/presentation-scene`
Presentation setup with stage, podium, and lighting.

## Example Workflows

### Creating a Dialogue Scene

```javascript
// 1. Create scene
create_scene({
  id: "wisdom-dialogue",
  title: "Dialogue on Wisdom and Law"
})

// 2. Add characters
add_character({ character: "solomon", x: -3, z: -3 })
add_character({ character: "solon", x: 0, z: -3 })
add_character({ character: "ibn", x: 3, z: -3 })

// 3. Add ground plane
add_object({ type: "ground", x: 0, z: 0 })

// 4. Add lighting
add_object({ type: "light", x: 0, y: 5, z: 0 })

// 5. Export trace
export_trace({ sceneId: "wisdom-dialogue" })

// 6. Generate viewable URL
generate_studio_url({ sceneId: "wisdom-dialogue" })
```

### Importing and Modifying a Scene

```javascript
// 1. Import existing trace
import_trace({ trace: { version: "1.1", scene: [...], events: [...] } })

// 2. List imported objects
list_objects({})

// 3. Move an object
move_object({
  objectId: "obj-1234567890",
  x: 5,
  rotationY: 90
})

// 4. Add new element
add_object({
  type: "text",
  x: 0,
  y: 3,
  z: -5,
  text: "Wisdom, Law, and Social Cohesion"
})
```

## Architecture

The MCP server maintains an in-memory scene graph:

```
SceneManager
├── scenes: Map<id, Scene>
│   └── Scene
│       ├── id: string
│       ├── created: timestamp
│       ├── metadata: object
│       ├── objects: Array<Object>
│       └── events: Array<Event>
└── activeScene: string
```

All operations are logged as events in ULP trace format, ensuring full reproducibility and compatibility with the trace calculus.

## ULP v1.1 Compatibility

This MCP server maintains the five immutable principles:

1. **Trace is Ground Truth**: All operations generate trace events
2. **World is Non-Executable**: Scenes are data, not code
3. **Projections are Pure**: Export operations are deterministic
4. **Effects are Forward-Only**: No retroactive scene modifications
5. **Information Flows Forward**: Scene → Trace → Export

## Development

```bash
# Install dependencies
npm install

# Run with auto-reload
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node index.js
```

## Integration Examples

### With Claude Desktop

Ask Claude to create scenes programmatically:

```
"Create a dialogue scene with Solomon, Solon, and Ibn Khaldun positioned
in a triangle. Add ground lighting and export as a trace."
```

Claude will use the MCP tools to:
1. Create the scene
2. Add the three characters
3. Add environment elements
4. Export the trace
5. Provide a viewable URL

### With Custom Clients

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
});

// Connect to server
await client.connect(transport);

// Call tool
const result = await client.callTool('create_scene', {
  id: 'my-scene',
  title: 'Custom Scene'
});
```

## License

MIT

## Related

- [Conversation Studio Web Interface](../docs/studio.html)
- [ULP v1.1 Specification](../Final%20README.md)
- [Model Context Protocol](https://modelcontextprotocol.io)
