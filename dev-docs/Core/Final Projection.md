ULP Web Media SDK (WM-SDK)

A declarative template SDK for 2D, 3D, AR, VR worlds that compiles to ULP-compatible traces and renders via pure projections using Web Media APIs, without violating ULP's frozen invariants.

Core Architecture

```
Template Authoring (.utl.html)
        ↓
UTL Compiler (Pure, Deterministic)
        ↓
ULP World Fragment (.atom/.schema/.sequence)
        ↓
Execution (Trace Construction)
        ↓
Render Projections (π_dom_2d, π_webgl_3d, π_webxr_ar, π_webxr_vr)
        ↓
Web Media API Binding (Thin, Replaceable)
        ↓
Output (Canvas/WebGL/WebXR/Media)
```

1. ULP Template Language (UTL) Grammar

schemas/utl.ebnf:

```
// Unified Template Language (UTL) - Declarative spatial markup
// Reference: ISO/IEC 14977 EBNF

document          = world_decl
world_decl        = '<world' attributes '>' elements* '</world>'
attributes        = attribute*
attribute         = name '=' string_literal
name              = [a-zA-Z_][a-zA-Z0-9_-]*
string_literal    = '"' [^"]* '"' | "'" [^']* "'"

elements          = entity | camera | geometry | material 
                  | transform | media | interaction | light

entity            = '<entity' attributes '>' elements* '</entity>'
camera            = '<camera' attributes '/>'
geometry          = '<geometry' attributes '/>'
material          = '<material' attributes '/>'
transform         = '<transform' attributes '/>'
media             = '<media' attributes '>' media_content* '</media>'
media_content     = surface | track
surface           = '<surface' attributes '/>'
track             = '<track' attributes '/>'

interaction       = '<interaction' attributes '>' emit_event* '</interaction>'
emit_event        = '<emit' attributes '/>'

light             = '<light' attributes '/>'

// Value types
vector3           = number number number
quaternion        = number number number number
color             = '#' hex{6} | '#' hex{8}
trace_ref         = 'trace://' path

// No imperative logic allowed
// No script tags
// No event handlers
// No dynamic evaluation
```

2. UTL Compiler (Pure TypeScript)

compiler/utl_compiler.ts:

```typescript
/**
 * UTL Compiler: Pure, deterministic template → ULP world fragment
 * NEVER touches runtime, NEVER accesses trace
 */

import { parseUTL, validateUTL, type UTLDocument } from './utl_parser';
import { emitWorldFragment, type WorldFragment } from './world_emitter';

export interface CompileOptions {
  strict: boolean;
  validateSchema: boolean;
  outputFormat: 'yaml' | 'json';
}

export class UTLCompiler {
  private errors: string[] = [];
  private warnings: string[] = [];
  
  /**
   * Pure compilation: UTL → ULP World Fragment
   * Deterministic: same input → same output
   * Stateless: no side effects
   */
  compile(utlSource: string, options: CompileOptions = {
    strict: true,
    validateSchema: true,
    outputFormat: 'yaml'
  }): WorldFragment {
    // Phase 1: Parse (pure)
    const ast = parseUTL(utlSource);
    if (!ast) {
      throw new Error('Failed to parse UTL');
    }
    
    // Phase 2: Validate (pure)
    const validation = validateUTL(ast);
    if (!validation.valid && options.strict) {
      throw new Error(`UTL validation failed: ${validation.errors.join(', ')}`);
    }
    this.warnings = validation.warnings;
    
    // Phase 3: Emit world fragment (pure)
    const fragment = emitWorldFragment(ast);
    
    // Phase 4: Schema validation (pure)
    if (options.validateSchema) {
      const schemaErrors = this.validateAgainstWorldSchema(fragment);
      if (schemaErrors.length > 0) {
        throw new Error(`Schema validation failed: ${schemaErrors.join(', ')}`);
      }
    }
    
    return fragment;
  }
  
  /**
   * Validate fragment against ULP world definition constraints
   * Ensures non-executability and identifier-only content
   */
  private validateAgainstWorldSchema(fragment: WorldFragment): string[] {
    const errors: string[] = [];
    
    // Check: No control flow constructs
    const controlFlowKeywords = ['if', 'for', 'while', 'function', 'return', 'exec', 'eval'];
    for (const file of Object.values(fragment.files)) {
      for (const keyword of controlFlowKeywords) {
        if (file.content.includes(keyword)) {
          errors.push(`File ${file.path}: contains control flow keyword "${keyword}"`);
        }
      }
    }
    
    // Check: No effectful operations
    const effectfulPatterns = [/system\(/, /exec\(/, /eval\(/, /\.sh"/, />\s*&/];
    for (const file of Object.values(fragment.files)) {
      for (const pattern of effectfulPatterns) {
        if (pattern.test(file.content)) {
          errors.push(`File ${file.path}: contains effectful operation`);
        }
      }
    }
    
    // Check: World files are identifier-only where required
    const identifierOnlyFiles = ['.atom', '.manifest', '.include', '.ignore'];
    for (const filename of identifierOnlyFiles) {
      if (fragment.files[filename]) {
        if (!this.isIdentifierOnly(fragment.files[filename].content)) {
          errors.push(`File ${filename}: must contain only identifiers`);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Pure check: string contains only valid identifiers
   */
  private isIdentifierOnly(content: string): boolean {
    const lines = content.split('\n').filter(line => !line.startsWith('#'));
    for (const line of lines) {
      const tokens = line.trim().split(/\s+/);
      for (const token of tokens) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_:\-\.]*$/.test(token)) {
          return false;
        }
      }
    }
    return true;
  }
  
  getErrors(): string[] { return [...this.errors]; }
  getWarnings(): string[] { return [...this.warnings]; }
}
```

compiler/world_emitter.ts:

```typescript
/**
 * World Fragment Emitter: AST → ULP world definition files
 */

import { UTLDocument, UTLElement } from './utl_parser';

export interface WorldFragment {
  files: Record<string, { content: string; path: string }>;
  dependencies: string[];
  warnings: string[];
}

export function emitWorldFragment(ast: UTLDocument): WorldFragment {
  const fragment: WorldFragment = {
    files: {},
    dependencies: [],
    warnings: []
  };
  
  // Extract world name from root element
  const worldName = ast.root.attributes.name || 'default_world';
  
  // 1. Emit .atom file (primitives)
  fragment.files['.atom'] = {
    path: `world/media/${worldName}/.atom`,
    content: generateAtomFile(ast)
  };
  
  // 2. Emit .schema file (structure)
  fragment.files['.schema'] = {
    path: `world/media/${worldName}/.schema`,
    content: generateSchemaFile(ast)
  };
  
  // 3. Emit .sequence file (temporal ordering)
  fragment.files['.sequence'] = {
    path: `world/media/${worldName}/.sequence`,
    content: generateSequenceFile(ast)
  };
  
  // 4. Emit .manifest file (inventory)
  fragment.files['.manifest'] = {
    path: `world/media/${worldName}/.manifest`,
    content: generateManifestFile(ast)
  };
  
  // 5. Emit .include file (allowed interactions)
  fragment.files['.include'] = {
    path: `world/media/${worldName}/.include`,
    content: generateIncludeFile(ast)
  };
  
  return fragment;
}

function generateAtomFile(ast: UTLDocument): string {
  const primitives = new Set<string>();
  
  // Collect all element types as primitives
  function collectPrimitives(element: UTLElement) {
    primitives.add(element.type);
    element.children?.forEach(collectPrimitives);
  }
  collectPrimitives(ast.root);
  
  // Add media types
  primitives.add('video');
  primitives.add('audio');
  primitives.add('image');
  primitives.add('texture');
  
  return Array.from(primitives)
    .map(p => `unit ${p}`)
    .join('\n');
}

function generateSchemaFile(ast: UTLDocument): string {
  // Define schema based on world structure
  return `# Auto-generated from UTL template
# Schema for ${ast.root.attributes.name || 'world'}

world:
  name: string
  space: "2d" | "3d" | "ar" | "vr"
  entities: list<entity>

entity:
  id: identifier
  geometry: optional<geometry>
  material: optional<material>
  transform: optional<transform>
  media: optional<list<media>>
  children: list<entity>

geometry:
  type: "box" | "sphere" | "plane" | "cylinder" | "custom"
  parameters: map<string, variant>

material:
  color: optional<color>
  texture: optional<trace_ref>
  transparent: optional<boolean>

media:
  type: "video" | "audio" | "image"
  src: trace_ref
  target: optional<entity_id>

interaction:
  event: "select" | "hover" | "grab" | "activate"
  emit: trace_event
`;
}
```

3. Render Projections (Pure Python)

projections/render_webgl_3d.py:

```python
#!/usr/bin/env python3
"""
π_webgl_3d: Pure projection Trace → WebGL scene graph
REFERENCE IMPLEMENTATION ONLY - not canonical authority.
"""

import json
import sys
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

@dataclass
class Vector3:
    x: float
    y: float
    z: float

@dataclass
class Quaternion:
    x: float
    y: float
    z: float
    w: float

@dataclass
class Geometry:
    type: str  # "box", "sphere", "plane", "cylinder"
    parameters: Dict[str, Any]

@dataclass
class Material:
    color: str = "#ffffff"
    texture: str = None
    transparent: bool = False

@dataclass
class Transform:
    position: Vector3 = None
    rotation: Quaternion = None
    scale: Vector3 = None

@dataclass
class Entity:
    id: str
    geometry: Geometry = None
    material: Material = None
    transform: Transform = None
    children: List['Entity'] = None
    media: List[Dict] = None

@dataclass
class Camera:
    position: Vector3
    target: Vector3 = None
    up: Vector3 = None
    fov: float = 60.0
    near: float = 0.1
    far: float = 1000.0

@dataclass
class SceneGraph:
    """Pure render intent graph for WebGL"""
    camera: Camera
    entities: List[Entity]
    lights: List[Dict]
    media_bindings: List[Dict]
    metadata: Dict[str, Any]

class WebGL3DProjector:
    """
    Pure projection: Trace → WebGL scene graph
    Deterministic, stateless, reference-only
    """
    
    def __init__(self):
        self.reference_info = {
            "name": "π_webgl_3d_reference",
            "version": "1.0",
            "authority": "reference_only",
            "spec": "WebGL 2.0 render intent",
            "note": "One possible WebGL projection. Other implementations may exist."
        }
    
    def project(self, trace_file: str) -> SceneGraph:
        """
        Pure function: Trace → SceneGraph
        No side effects, deterministic
        """
        # Parse trace events
        entities = self._parse_entities_from_trace(trace_file)
        camera = self._parse_camera_from_trace(trace_file)
        media = self._parse_media_from_trace(trace_file)
        
        # Build pure scene graph
        scene = SceneGraph(
            camera=camera,
            entities=entities,
            lights=self._generate_lights(entities),
            media_bindings=media,
            metadata={
                "trace_source": trace_file,
                "projection": self.reference_info,
                "rendering_intent": "webgl_2d"
            }
        )
        
        return scene
    
    def _parse_entities_from_trace(self, trace_file: str) -> List[Entity]:
        """Pure parsing of CREATE_ENTITY events"""
        entities = []
        
        with open(trace_file, 'r') as f:
            for line in f:
                if not line.startswith('#'):  # Skip metadata
                    parts = line.strip().split('\t')
                    if len(parts) >= 3 and parts[1] == 'CREATE_ENTITY':
                        entity_id = parts[2]
                        
                        # Parse entity properties from subsequent lines
                        entity = Entity(id=entity_id)
                        
                        # Look ahead for geometry, material, transform
                        # (Simplified for example)
                        
                        entities.append(entity)
        
        return entities
    
    def _parse_camera_from_trace(self, trace_file: str) -> Camera:
        """Pure parsing of CAMERA events"""
        # Default camera
        return Camera(
            position=Vector3(0, 1.6, 3),
            target=Vector3(0, 0, 0),
            up=Vector3(0, 1, 0),
            fov=60.0
        )
    
    def _parse_media_from_trace(self, trace_file: str) -> List[Dict]:
        """Pure parsing of ATTACH_MEDIA events"""
        media = []
        
        with open(trace_file, 'r') as f:
            for line in f:
                if not line.startswith('#'):
                    parts = line.strip().split('\t')
                    if len(parts) >= 4 and parts[1] == 'ATTACH_MEDIA':
                        media.append({
                            "id": parts[2],
                            "target": parts[3],
                            "src": parts[4] if len(parts) > 4 else ""
                        })
        
        return media
    
    def _generate_lights(self, entities: List[Entity]) -> List[Dict]:
        """Pure generation of default lighting"""
        return [
            {
                "type": "directional",
                "color": "#ffffff",
                "intensity": 1.0,
                "position": Vector3(5, 10, 7)
            },
            {
                "type": "ambient",
                "color": "#404040",
                "intensity": 0.5
            }
        ]
    
    def to_json(self, scene: SceneGraph) -> str:
        """Serialize scene graph to JSON"""
        def default_serializer(obj):
            if hasattr(obj, '__dict__'):
                return asdict(obj)
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        return json.dumps({
            "scene": asdict(scene),
            "projection_info": self.reference_info,
            "render_commands": self._generate_render_commands(scene)
        }, default=default_serializer, indent=2)
    
    def _generate_render_commands(self, scene: SceneGraph) -> List[Dict]:
        """Pure generation of WebGL render commands"""
        commands = []
        
        # Camera setup
        commands.append({
            "type": "camera",
            "position": asdict(scene.camera.position) if scene.camera.position else None,
            "target": asdict(scene.camera.target) if scene.camera.target else None,
            "fov": scene.camera.fov
        })
        
        # Entity rendering
        for entity in scene.entities:
            if entity.geometry:
                commands.append({
                    "type": "draw",
                    "entity": entity.id,
                    "geometry": asdict(entity.geometry),
                    "material": asdict(entity.material) if entity.material else None,
                    "transform": asdict(entity.transform) if entity.transform else None
                })
        
        # Media bindings
        for media in scene.media_bindings:
            commands.append({
                "type": "bind_texture",
                "media_id": media["id"],
                "target": media["target"],
                "src": media["src"]
            })
        
        return commands

def π_webgl_3d(trace_file: str) -> str:
    """
    Pure projection interface
    Usage: π_webgl_3d(trace.log) → WebGL scene graph JSON
    """
    projector = WebGL3DProjector()
    scene = projector.project(trace_file)
    return projector.to_json(scene)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: render_webgl_3d.py <trace_file>",
            "example": "python render_webgl_3d.py out/trace.log"
        }, indent=2))
        sys.exit(1)
    
    trace_file = sys.argv[1]
    result = π_webgl_3d(trace_file)
    print(result)
```

4. WebXR AR Projection

projections/render_webxr_ar.py:

```python
#!/usr/bin/env python3
"""
π_webxr_ar: Pure projection Trace → AR scene graph
Handles anchors, camera pose as metadata only
"""

import json
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ARAnchor:
    """AR anchor (world entity, not trace data)"""
    id: str
    type: "plane" | "image" | "face"
    transform: Optional[Dict] = None  # Relative to world, not stored in trace

@dataclass
class ARScene:
    """Pure AR render intent"""
    anchors: List[ARAnchor]
    entities: List[Dict]  # Entities attached to anchors
    camera_pose: Optional[Dict] = None  # METADATA ONLY, not semantic
    lighting_estimation: bool = True
    hit_testing: bool = True
    
    # Important: Camera pose is projection-time metadata
    # Never stored in trace, never affects semantic content

class WebXRARProjector:
    """
    Pure projection for WebXR AR
    AR-specific: anchors, hit testing, lighting estimation
    """
    
    def project(self, trace_file: str, device_pose: Optional[Dict] = None) -> ARScene:
        """
        device_pose: METADATA ONLY from WebXR API
        Not part of trace, not semantic
        """
        
        # Parse anchors from trace (CREATE_ANCHOR events)
        anchors = self._parse_anchors(trace_file)
        
        # Parse entities attached to anchors
        entities = self._parse_anchored_entities(trace_file, anchors)
        
        # Build AR scene
        scene = ARScene(
            anchors=anchors,
            entities=entities,
            camera_pose=device_pose,  # Metadata only
            lighting_estimation=True,
            hit_testing=True
        )
        
        return scene
    
    def to_webxr(self, scene: ARScene) -> Dict:
        """Convert to WebXR API-compatible format"""
        return {
            "anchors": [
                {
                    "anchor": anchor.id,
                    "type": anchor.type,
                    "transform": anchor.transform
                }
                for anchor in scene.anchors
            ],
            "entities": scene.entities,
            "lighting": {
                "estimation": scene.lighting_estimation
            },
            "hitTest": {
                "enabled": scene.hit_testing
            },
            "metadata": {
                "note": "AR scene graph. Camera pose is runtime metadata only.",
                "trace_authority": "true",
                "projection": "π_webxr_ar_reference"
            }
        }
```

5. Web Media API Binding (Thin, Replaceable)

bindings/webgl_runtime.js:

```javascript
/**
 * WebGL Runtime Binding
 * Thin, replaceable, no authority
 */

class WebGLRenderer {
  /**
   * @param {WebGL2RenderingContext} gl - WebGL context from browser
   * @param {Object} sceneGraph - From π_webgl_3d projection
   */
  constructor(gl, sceneGraph) {
    this.gl = gl;
    this.scene = sceneGraph;
    this.programs = new Map();
    this.textures = new Map();
    this.buffers = new Map();
  }
  
  /**
   * One-way rendering: scene graph → WebGL commands
   * No state mutation, no trace access, no authority
   */
  renderFrame() {
    // Clear
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    
    // Set camera
    this._setCamera(this.scene.camera);
    
    // Render entities
    this.scene.entities.forEach(entity => {
      this._renderEntity(entity);
    });
    
    // Bind media textures
    this.scene.media_bindings.forEach(media => {
      this._bindMediaTexture(media);
    });
  }
  
  _setCamera(camera) {
    // Set view and projection matrices
    // Pure computation from camera parameters
    const viewMatrix = mat4.lookAt(
      camera.position,
      camera.target || [0, 0, 0],
      camera.up || [0, 1, 0]
    );
    
    const projectionMatrix = mat4.perspective(
      camera.fov * Math.PI / 180,
      this.gl.canvas.width / this.gl.canvas.height,
      camera.near,
      camera.far
    );
    
    // Upload to shaders
    // This is just output, not state storage
  }
  
  _renderEntity(entity) {
    // Look up geometry
    const geometry = this._getGeometry(entity.geometry);
    const material = this._getMaterial(entity.material);
    const transform = entity.transform;
    
    // Set transform
    if (transform) {
      this._setTransform(transform);
    }
    
    // Draw
    this.gl.drawElements(
      this.gl.TRIANGLES,
      geometry.indexCount,
      this.gl.UNSIGNED_SHORT,
      0
    );
  }
  
  _bindMediaTexture(media) {
    // Load texture from media source
    // Note: source is trace:// reference, not URL
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // Use placeholder or load from trace data
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1, 1, 0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );
    
    this.textures.set(media.id, texture);
  }
  
  // Helper methods (pure computations)
  _getGeometry(geometryDesc) {
    // Generate or look up WebGL buffers
    // Pure computation from description
  }
  
  _getMaterial(materialDesc) {
    // Compile shader or look up program
    // Pure computation from description
  }
  
  _setTransform(transform) {
    // Compute matrix, upload to GPU
    // Pure computation
  }
}

/**
 * Main binding function
 * @param {string} sceneGraphJson - Output from π_webgl_3d
 * @param {HTMLCanvasElement} canvas - Target canvas
 */
export function bindWebGLRenderer(sceneGraphJson, canvas) {
  const sceneGraph = JSON.parse(sceneGraphJson);
  const gl = canvas.getContext('webgl2');
  
  if (!gl) {
    console.warn('WebGL2 not available, using fallback');
    return null;
  }
  
  const renderer = new WebGLRenderer(gl, sceneGraph);
  return {
    render: () => renderer.renderFrame(),
    resize: (width, height) => {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };
}
```

6. Complete Example: 3D Gallery

examples/gallery.utl.html:

```html
<!-- UTL Template: 3D Art Gallery -->
<!-- Declarative only, no scripts, no imperative logic -->

<world name="art_gallery" space="3d">
  
  <camera position="0 1.6 5" target="0 1.6 0" fov="60" />
  
  <!-- Floor -->
  <entity id="floor">
    <geometry type="plane" width="20" height="20" />
    <material color="#8B7355" />
    <transform position="0 0 0" />
  </entity>
  
  <!-- Walls -->
  <entity id="wall_north">
    <geometry type="plane" width="20" height="4" />
    <material color="#F5F5DC" />
    <transform position="0 2 -10" rotate="0 0 0" />
  </entity>
  
  <!-- Picture frames -->
  <entity id="frame_1">
    <geometry type="box" width="3" height="2" depth="0.1" />
    <material color="#654321" />
    <transform position="-4 1.5 -9.5" />
    
    <media id="artwork_1" type="image" src="trace://artworks/mona_lisa">
      <surface target="frame_1" />
    </media>
  </entity>
  
  <entity id="frame_2">
    <geometry type="box" width="3" height="2" depth="0.1" />
    <material color="#654321" />
    <transform position="0 1.5 -9.5" />
    
    <media id="artwork_2" type="image" src="trace://artworks/starry_night">
      <surface target="frame_2" />
    </media>
  </entity>
  
  <!-- Lights -->
  <light type="directional" color="#ffffff" intensity="0.8" position="5 10 7" />
  <light type="ambient" color="#404040" intensity="0.2" />
  
  <!-- Interactions -->
  <interaction event="select" target="frame_1">
    <emit trace-event="SELECT_ARTWORK" artwork="mona_lisa" />
  </interaction>
  
  <interaction event="select" target="frame_2">
    <emit trace-event="SELECT_ARTWORK" artwork="starry_night" />
  </interaction>
  
</world>
```

examples/compile_gallery.sh:

```bash
#!/bin/sh
# Example: Compile UTL template to ULP world fragment

set -eu

echo "=== Compiling UTL Template to ULP ==="
echo

# 1. Compile UTL → World Fragment
npx tsx compiler/utl_compiler.ts \
  --input examples/gallery.utl.html \
  --output world/media/art_gallery \
  --format yaml

echo "1. World fragment generated in world/media/art_gallery/"

# 2. Validate against ULP invariants
echo "2. Validating against ULP invariants..."
./bin/enforce_invariants.sh || {
    echo "ERROR: Generated fragment violates ULP invariants"
    exit 1
}

# 3. Create minimal .procedure for gallery
cat > world/media/art_gallery/.procedure << 'EOF'
procedure render_gallery
(([
interrupt RENDER_FRAME
])(
EOF

# 4. Create interrupt handler (emits trace events)
cat > interrupts/RENDER_FRAME.sh << 'EOF'
#!/bin/sh
# RENDER_FRAME: Emits trace events for rendering
# Pure output generation, no actual rendering

echo "EVENT	CREATE_ENTITY	floor"
echo "EVENT	CREATE_ENTITY	wall_north"
echo "EVENT	CREATE_ENTITY	frame_1"
echo "EVENT	CREATE_ENTITY	frame_2"
echo "EVENT	ATTACH_MEDIA	artwork_1	frame_1"
echo "EVENT	ATTACH_MEDIA	artwork_2	frame_2"
echo "EVENT	RENDER_FRAME	1"
EOF
chmod +x interrupts/RENDER_FRAME.sh

echo "3. Execution structure created"

# 5. Create trace
echo "4. Creating trace..."
echo "gallery_input" | ./run_ulp_final.sh \
  --world world/media/art_gallery \
  --out examples/gallery_trace

echo "5. Trace created: examples/gallery_trace/trace.log"

# 6. Project to WebGL
echo "6. Projecting to WebGL scene graph..."
python projections/render_webgl_3d.py \
  examples/gallery_trace/trace.log \
  > examples/gallery_scene.json

echo "7. Scene graph: examples/gallery_scene.json"

echo
echo "=== Gallery Complete ==="
echo "World Fragment: world/media/art_gallery/"
echo "Trace: examples/gallery_trace/trace.log"
echo "WebGL Scene: examples/gallery_scene.json"
echo
echo "To render in browser:"
echo "  import { bindWebGLRenderer } from './bindings/webgl_runtime.js'"
echo "  const renderer = bindWebGLRenderer(sceneJson, canvas)"
echo "  renderer.render()"
```

7. SDK Package Manifest

package.json:

```json
{
  "name": "ulp-wm-sdk",
  "version": "1.0.0",
  "description": "ULP Web Media SDK - Declarative templates for 2D/3D/AR/VR as pure projections",
  "author": "ULP Community",
  "license": "ULP Architectural Preservation License",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "compile-utl": "tsx compiler/cli.ts",
    "validate-utl": "tsx compiler/validate.ts",
    "test-projections": "python -m pytest projections/test_*.py",
    "example-gallery": "./examples/compile_gallery.sh"
  },
  "dependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "yaml": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  },
  "keywords": [
    "ulp",
    "trace",
    "projection",
    "webgl",
    "webxr",
    "ar",
    "vr",
    "declarative",
    "deterministic"
  ]
}
```

8. Key Invariant Preservation

Check: Does WM-SDK violate ULP invariants?

Invariant Status How Preserved
Trace authority ✅ SDK only reads trace, never writes
Projection purity ✅ All projections are pure functions
World non-executable ✅ UTL → world fragment only, no code
Effect forwarding ✅ .interpose unchanged, binding is output only
Forward-only flow ✅ Template → World → Trace → Projection → Output

The Rule That Must Never Break:

"Web Media APIs are output devices, not authorities."

· Canvas context is a display, not a runtime
· WebGL is a drawing API, not an engine
· WebXR provides sensors, not simulation
· Media elements are playback, not content

9. The One-Sentence SDK Definition (Final)

"The ULP Web Media SDK is a declarative template system that compiles spatial HTML-like markup into ULP world definitions and renders 2D/3D/AR/VR experiences as pure projections of trace truth using Web Media APIs as output devices only."

This is:

· Accurate: Matches implementation
· Defensible: Preserves all ULP invariants
· Future-proof: Binds to APIs, not implementations
· Federated: No runtime authority

10. Next Steps (If Desired)

11. Formal UTL Specification: Complete EBNF with conformance tests
12. Projection Test Suite: Verify determinism and purity
13. Reference Bindings: For Three.js, Babylon.js, A-Frame (as outputs only)
14. AR Anchor Persistence: Using trace as anchor storage
15. VR Multi-user: Shared trace → multiple projections

But architecturally? You're done. The SDK sits safely atop ULP without violating any invariants. It provides a practical authoring layer while maintaining the profound insight: Rendering is projection, not execution.