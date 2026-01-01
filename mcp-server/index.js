#!/usr/bin/env node

/**
 * ULP Conversation Studio MCP Server
 * Model Context Protocol server for programmatic scene manipulation
 *
 * Provides RPC tools for:
 * - Scene creation and management
 * - Object placement and manipulation
 * - P2P collaboration control
 * - Trace export and import
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ===== IN-MEMORY SCENE STATE =====
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeScene = null;
  }

  createScene(id, metadata = {}) {
    const scene = {
      id,
      created: new Date().toISOString(),
      metadata,
      objects: [],
      events: []
    };
    this.scenes.set(id, scene);
    this.activeScene = id;
    return scene;
  }

  getScene(id) {
    return this.scenes.get(id || this.activeScene);
  }

  addObject(sceneId, type, position, properties = {}) {
    const scene = this.getScene(sceneId);
    if (!scene) throw new Error('Scene not found');

    const object = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      rotation: properties.rotation || { x: 0, y: 0, z: 0 },
      scale: properties.scale || { x: 1, y: 1, z: 1 },
      properties
    };

    scene.objects.push(object);
    scene.events.push({
      timestamp: Date.now(),
      type: 'ADD_OBJECT',
      data: { objectId: object.id, objectType: type, position }
    });

    return object;
  }

  moveObject(sceneId, objectId, position, rotation, scale) {
    const scene = this.getScene(sceneId);
    if (!scene) throw new Error('Scene not found');

    const object = scene.objects.find(o => o.id === objectId);
    if (!object) throw new Error('Object not found');

    if (position) object.position = position;
    if (rotation) object.rotation = rotation;
    if (scale) object.scale = scale;

    scene.events.push({
      timestamp: Date.now(),
      type: 'MOVE_OBJECT',
      data: { objectId, position, rotation, scale }
    });

    return object;
  }

  deleteObject(sceneId, objectId) {
    const scene = this.getScene(sceneId);
    if (!scene) throw new Error('Scene not found');

    const index = scene.objects.findIndex(o => o.id === objectId);
    if (index === -1) throw new Error('Object not found');

    const deleted = scene.objects.splice(index, 1)[0];

    scene.events.push({
      timestamp: Date.now(),
      type: 'DELETE_OBJECT',
      data: { objectId }
    });

    return deleted;
  }

  exportTrace(sceneId) {
    const scene = this.getScene(sceneId);
    if (!scene) throw new Error('Scene not found');

    return {
      version: '1.1',
      created: scene.created,
      metadata: scene.metadata,
      scene: scene.objects.map(obj => ({
        id: obj.id,
        type: obj.type,
        position: obj.position,
        rotation: obj.rotation,
        scale: obj.scale
      })),
      events: scene.events
    };
  }

  importTrace(trace) {
    const sceneId = `imported-${Date.now()}`;
    const scene = this.createScene(sceneId, trace.metadata);

    scene.objects = trace.scene.map(obj => ({
      ...obj,
      properties: {}
    }));

    scene.events = trace.events || [];

    return scene;
  }

  listScenes() {
    return Array.from(this.scenes.values()).map(s => ({
      id: s.id,
      created: s.created,
      objectCount: s.objects.length,
      eventCount: s.events.length
    }));
  }
}

// ===== MCP SERVER SETUP =====
const sceneManager = new SceneManager();

const server = new Server(
  {
    name: 'ulp-conversation-studio',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ===== TOOL DEFINITIONS =====
const TOOLS = [
  {
    name: 'create_scene',
    description: 'Create a new 3D scene for the Conversation Studio',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier for the scene'
        },
        title: {
          type: 'string',
          description: 'Human-readable title for the scene'
        },
        description: {
          type: 'string',
          description: 'Description of the scene purpose'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'add_character',
    description: 'Add a character (Solomon, Solon, or Ibn Khaldun) to the active scene',
    inputSchema: {
      type: 'object',
      properties: {
        character: {
          type: 'string',
          enum: ['solomon', 'solon', 'ibn'],
          description: 'Character to add: solomon (wisdom), solon (law), ibn (social cohesion)'
        },
        x: { type: 'number', description: 'X position (left-right)' },
        y: { type: 'number', description: 'Y position (up-down)', default: 0 },
        z: { type: 'number', description: 'Z position (forward-back)' },
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' }
      },
      required: ['character', 'x', 'z']
    }
  },
  {
    name: 'add_object',
    description: 'Add a primitive object or environment element to the scene',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['box', 'sphere', 'cylinder', 'plane', 'gate', 'ground', 'light', 'text'],
          description: 'Type of object to add'
        },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position', default: 0 },
        z: { type: 'number', description: 'Z position' },
        text: { type: 'string', description: 'Text content (for text objects)' },
        color: { type: 'string', description: 'Hex color (e.g., #FF0000)' },
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' }
      },
      required: ['type', 'x', 'z']
    }
  },
  {
    name: 'move_object',
    description: 'Move or transform an object in the scene',
    inputSchema: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'ID of object to move' },
        x: { type: 'number', description: 'New X position' },
        y: { type: 'number', description: 'New Y position' },
        z: { type: 'number', description: 'New Z position' },
        rotationY: { type: 'number', description: 'Rotation around Y axis (degrees)' },
        scale: { type: 'number', description: 'Uniform scale factor' },
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' }
      },
      required: ['objectId']
    }
  },
  {
    name: 'delete_object',
    description: 'Remove an object from the scene',
    inputSchema: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'ID of object to delete' },
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' }
      },
      required: ['objectId']
    }
  },
  {
    name: 'list_objects',
    description: 'List all objects in a scene',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' }
      }
    }
  },
  {
    name: 'export_trace',
    description: 'Export the scene as a ULP v1.1 trace (JSON format)',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' }
      }
    }
  },
  {
    name: 'import_trace',
    description: 'Import a scene from a ULP v1.1 trace JSON',
    inputSchema: {
      type: 'object',
      properties: {
        trace: {
          type: 'object',
          description: 'ULP trace object with version, scene, and events'
        }
      },
      required: ['trace']
    }
  },
  {
    name: 'list_scenes',
    description: 'List all scenes currently in memory',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'generate_studio_url',
    description: 'Generate a URL to view the scene in the Conversation Studio web interface',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'Scene ID (uses active scene if omitted)' },
        baseUrl: {
          type: 'string',
          description: 'Base URL for the studio',
          default: 'https://universal-life-protocol.github.io/core/docs/studio.html'
        }
      }
    }
  }
];

// ===== TOOL HANDLERS =====
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_scene': {
        const scene = sceneManager.createScene(args.id, {
          title: args.title,
          description: args.description
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              scene: {
                id: scene.id,
                created: scene.created,
                metadata: scene.metadata
              }
            }, null, 2)
          }]
        };
      }

      case 'add_character': {
        const object = sceneManager.addObject(
          args.sceneId,
          args.character,
          { x: args.x, y: args.y || 0, z: args.z }
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Added ${args.character} at position (${args.x}, ${args.y || 0}, ${args.z})`,
              object
            }, null, 2)
          }]
        };
      }

      case 'add_object': {
        const object = sceneManager.addObject(
          args.sceneId,
          args.type,
          { x: args.x, y: args.y || 0, z: args.z },
          { text: args.text, color: args.color }
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Added ${args.type} at position (${args.x}, ${args.y || 0}, ${args.z})`,
              object
            }, null, 2)
          }]
        };
      }

      case 'move_object': {
        const position = (args.x !== undefined || args.y !== undefined || args.z !== undefined)
          ? { x: args.x, y: args.y, z: args.z }
          : undefined;
        const rotation = args.rotationY !== undefined
          ? { x: 0, y: args.rotationY, z: 0 }
          : undefined;
        const scale = args.scale !== undefined
          ? { x: args.scale, y: args.scale, z: args.scale }
          : undefined;

        const object = sceneManager.moveObject(
          args.sceneId,
          args.objectId,
          position,
          rotation,
          scale
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Moved object ${args.objectId}`,
              object
            }, null, 2)
          }]
        };
      }

      case 'delete_object': {
        const deleted = sceneManager.deleteObject(args.sceneId, args.objectId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Deleted object ${args.objectId}`,
              deleted
            }, null, 2)
          }]
        };
      }

      case 'list_objects': {
        const scene = sceneManager.getScene(args.sceneId);
        if (!scene) throw new Error('Scene not found');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              sceneId: scene.id,
              objects: scene.objects,
              count: scene.objects.length
            }, null, 2)
          }]
        };
      }

      case 'export_trace': {
        const trace = sceneManager.exportTrace(args.sceneId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(trace, null, 2)
          }]
        };
      }

      case 'import_trace': {
        const scene = sceneManager.importTrace(args.trace);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Trace imported successfully',
              scene: {
                id: scene.id,
                objectCount: scene.objects.length,
                eventCount: scene.events.length
              }
            }, null, 2)
          }]
        };
      }

      case 'list_scenes': {
        const scenes = sceneManager.listScenes();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              scenes,
              count: scenes.length,
              activeScene: sceneManager.activeScene
            }, null, 2)
          }]
        };
      }

      case 'generate_studio_url': {
        const scene = sceneManager.getScene(args.sceneId);
        if (!scene) throw new Error('Scene not found');

        const trace = sceneManager.exportTrace(args.sceneId);
        const traceEncoded = encodeURIComponent(JSON.stringify(trace));
        const baseUrl = args.baseUrl || 'https://universal-life-protocol.github.io/core/docs/studio.html';
        const url = `${baseUrl}#trace=${traceEncoded}`;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              url,
              message: 'Open this URL in a browser to view the scene in Conversation Studio'
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2)
      }],
      isError: true
    };
  }
});

// ===== RESOURCES (Scene Templates) =====
const RESOURCES = [
  {
    uri: 'ulp://templates/dialogue-scene',
    name: 'Three-Way Dialogue Scene',
    description: 'Template for a conversation between Solomon, Solon, and Ibn Khaldun',
    mimeType: 'application/json'
  },
  {
    uri: 'ulp://templates/presentation-scene',
    name: 'Presentation Scene',
    description: 'Template for a presentation with podium and audience area',
    mimeType: 'application/json'
  }
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'ulp://templates/dialogue-scene') {
    const scene = sceneManager.createScene('dialogue-template', {
      title: 'Three-Way Dialogue',
      description: 'Solomon, Solon, and Ibn Khaldun in conversation'
    });
    sceneManager.addObject(scene.id, 'solomon', { x: -3, y: 0, z: -3 });
    sceneManager.addObject(scene.id, 'solon', { x: 0, y: 0, z: -3 });
    sceneManager.addObject(scene.id, 'ibn', { x: 3, y: 0, z: -3 });
    const trace = sceneManager.exportTrace(scene.id);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(trace, null, 2)
      }]
    };
  }

  if (uri === 'ulp://templates/presentation-scene') {
    const scene = sceneManager.createScene('presentation-template', {
      title: 'Presentation Scene',
      description: 'Stage with podium and lighting'
    });
    sceneManager.addObject(scene.id, 'ground', { x: 0, y: 0, z: 0 });
    sceneManager.addObject(scene.id, 'box', { x: 0, y: 0.5, z: -5 }, { color: '#8B4513' });
    sceneManager.addObject(scene.id, 'light', { x: -3, y: 4, z: -3 });
    sceneManager.addObject(scene.id, 'light', { x: 3, y: 4, z: -3 });
    const trace = sceneManager.exportTrace(scene.id);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(trace, null, 2)
      }]
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// ===== START SERVER =====
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ULP Conversation Studio MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
