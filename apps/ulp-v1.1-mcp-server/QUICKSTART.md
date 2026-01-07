# MCP Server Quick Start

Get started with the ULP Conversation Studio MCP server in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
cd mcp-server
npm install
```

## Quick Test

### 1. Start the MCP Inspector

```bash
npx @modelcontextprotocol/inspector node index.js
```

This opens a web interface at `http://localhost:5173` for testing MCP tools.

### 2. Create Your First Scene

In the Inspector, call the `create_scene` tool:

```json
{
  "id": "test-scene",
  "title": "My First Scene"
}
```

### 3. Add Characters

Call `add_character` three times:

**Solomon (Wisdom):**
```json
{
  "character": "solomon",
  "x": -3,
  "z": -3
}
```

**Solon (Law):**
```json
{
  "character": "solon",
  "x": 0,
  "z": -3
}
```

**Ibn Khaldun (Social Cohesion):**
```json
{
  "character": "ibn",
  "x": 3,
  "z": -3
}
```

### 4. View Your Scene

Call `generate_studio_url`:

```json
{
  "sceneId": "test-scene"
}
```

Copy the returned URL and open it in your browser to see your 3D scene!

## Using with Claude Desktop

### 1. Find Your Config File

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### 2. Add MCP Server

Edit the config file:

```json
{
  "mcpServers": {
    "ulp-studio": {
      "command": "node",
      "args": [
        "/absolute/path/to/apps/ulp-v1.1-mcp-server/index.js"
      ]
    }
  }
}
```

**Important:** Use the absolute path to `index.js`.

### 3. Restart Claude Desktop

Completely quit and restart Claude Desktop.

### 4. Test It

In Claude Desktop, try:

```
Create a dialogue scene with Solomon, Solon, and Ibn Khaldun.
Add some ground and lighting. Then generate a URL I can view.
```

Claude will use the MCP tools to create the scene programmatically!

## Example Conversations with Claude

### Creating a Custom Scene

```
"I want to create a scene called 'wisdom-council' with:
- Solomon positioned at (-4, 0, -5)
- Solon at (0, 0, -5)
- Ibn Khaldun at (4, 0, -5)
- A light source above them
- Generate a URL I can view"
```

### Modifying an Existing Scene

```
"List all the objects in the current scene.
Move Solomon to position (0, 0, -8).
Add a sphere at (0, 2, -5) with color #FFD700.
Export the trace as JSON."
```

### Using Templates

```
"Load the dialogue-scene template, then add lighting
and export it as a trace I can save."
```

## Common Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `create_scene` | Start a new scene | Create "my-scene" |
| `add_character` | Add Solomon/Solon/Ibn | Add solomon at (-3, 0, -3) |
| `add_object` | Add primitives/lights | Add sphere at (0, 1, 0) |
| `move_object` | Transform objects | Move to (5, 2, -3) |
| `list_objects` | See what's in scene | List all objects |
| `export_trace` | Get JSON trace | Export current scene |
| `generate_studio_url` | Get viewable link | Generate URL |

## Troubleshooting

### "MCP server not found" in Claude

- Verify the absolute path in config
- Check Node.js is installed: `node --version`
- Ensure config is valid JSON (use a JSON validator)
- Restart Claude Desktop completely

### "Scene not found" error

- Create a scene first with `create_scene`
- Check scene ID matches with `list_scenes`
- Active scene is auto-selected if no ID provided

### URL doesn't load scene

- Check that the trace JSON is valid
- Ensure the URL isn't truncated
- Try importing the trace directly in the studio

## Next Steps

- Read the full [README.md](./README.md) for all tools
- Explore [example workflows](./README.md#example-workflows)
- Check the [architecture docs](./README.md#architecture)
- View [ULP v1.1 specification](../Final%20README.md)

## Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Claude Desktop](https://claude.ai/download)
- [Conversation Studio](https://universal-life-protocol.github.io/core/docs/studio.html)
