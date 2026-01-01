// Conversation Studio - Asset Management & Recording System
// Universal Life Protocol v1.1

// ===== CAMERA NAVIGATION SYSTEM =====
class CameraNavigator {
  constructor(cameraRig) {
    this.cameraRig = cameraRig;
    this.camera = document.querySelector('#main-camera');
    this.moveSpeed = 0.1;
    this.rotateSpeed = 0.003;
    this.zoomSpeed = 0.5;

    this.keys = { w: false, a: false, s: false, d: false };
    this.mouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.rotation = { x: 0, y: 0 };

    this.touchStartDistance = 0;
    this.touchStartRotation = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.setupKeyboard();
    this.setupMouse();
    this.setupScroll();
    this.setupTouch();
    this.startUpdateLoop();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        this.keys[key] = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        this.keys[key] = false;
      }
    });
  }

  setupMouse() {
    const sceneContainer = document.getElementById('scene-container');

    sceneContainer.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right click
        this.mouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.rotation.y -= deltaX * this.rotateSpeed;
        this.rotation.x -= deltaY * this.rotateSpeed;
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

        this.cameraRig.setAttribute('rotation', `${this.rotation.x * 180 / Math.PI} ${this.rotation.y * 180 / Math.PI} 0`);

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.mouseDown = false;
      }
    });

    sceneContainer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setupScroll() {
    const sceneContainer = document.getElementById('scene-container');

    sceneContainer.addEventListener('wheel', (e) => {
      const currentPos = this.camera.getAttribute('position');
      const newZ = currentPos.z + (e.deltaY > 0 ? this.zoomSpeed : -this.zoomSpeed);
      const clampedZ = Math.max(2, Math.min(20, newZ));
      this.camera.setAttribute('position', `${currentPos.x} ${currentPos.y} ${clampedZ}`);
      e.preventDefault();
    });
  }

  setupTouch() {
    const sceneContainer = document.getElementById('scene-container');

    sceneContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.touchStartDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
      } else if (e.touches.length === 1) {
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.touchStartRotation = { ...this.rotation };
      }
    });

    sceneContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const delta = this.touchStartDistance - distance;

        const currentPos = this.camera.getAttribute('position');
        const newZ = currentPos.z + delta * 0.01;
        const clampedZ = Math.max(2, Math.min(20, newZ));
        this.camera.setAttribute('position', `${currentPos.x} ${currentPos.y} ${clampedZ}`);

        this.touchStartDistance = distance;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // Swipe to rotate
        const deltaX = e.touches[0].clientX - this.lastMouseX;
        const deltaY = e.touches[0].clientY - this.lastMouseY;

        this.rotation.y -= deltaX * this.rotateSpeed;
        this.rotation.x -= deltaY * this.rotateSpeed;
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

        this.cameraRig.setAttribute('rotation', `${this.rotation.x * 180 / Math.PI} ${this.rotation.y * 180 / Math.PI} 0`);

        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        e.preventDefault();
      }
    });
  }

  startUpdateLoop() {
    const update = () => {
      if (this.keys.w || this.keys.a || this.keys.s || this.keys.d) {
        const currentPos = this.cameraRig.getAttribute('position');
        const rotation = this.cameraRig.getAttribute('rotation');
        const yRad = rotation.y * Math.PI / 180;

        let dx = 0, dz = 0;

        if (this.keys.w) {
          dx -= Math.sin(yRad) * this.moveSpeed;
          dz -= Math.cos(yRad) * this.moveSpeed;
        }
        if (this.keys.s) {
          dx += Math.sin(yRad) * this.moveSpeed;
          dz += Math.cos(yRad) * this.moveSpeed;
        }
        if (this.keys.a) {
          dx -= Math.cos(yRad) * this.moveSpeed;
          dz += Math.sin(yRad) * this.moveSpeed;
        }
        if (this.keys.d) {
          dx += Math.cos(yRad) * this.moveSpeed;
          dz -= Math.sin(yRad) * this.moveSpeed;
        }

        this.cameraRig.setAttribute('position', `${currentPos.x + dx} ${currentPos.y} ${currentPos.z + dz}`);
      }

      requestAnimationFrame(update);
    };
    update();
  }
}

// ===== P2P COLLABORATION SYSTEM =====
class P2PManager {
  constructor(studio) {
    this.studio = studio;
    this.peer = null;
    this.connections = new Map();
    this.peerId = null;
    this.isHost = false;

    this.peerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    this.colorIndex = 0;
  }

  async init() {
    // Use PeerJS library (will be loaded via CDN)
    if (typeof Peer === 'undefined') {
      console.warn('PeerJS not loaded. P2P features disabled.');
      return;
    }

    this.peer = new Peer();

    this.peer.on('open', (id) => {
      this.peerId = id;
      this.updateConnectionUI();
      console.log('P2P Ready. Your ID:', id);
    });

    this.peer.on('connection', (conn) => {
      this.handleIncomingConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('P2P Error:', err);
      this.showNotification('P2P Error: ' + err.type, 'error');
    });
  }

  createRoom() {
    if (!this.peerId) return;

    this.isHost = true;
    this.updateConnectionUI();
    this.showNotification(`Room created! Share ID: ${this.peerId}`, 'success');
  }

  joinRoom(remoteId) {
    if (!this.peer || !remoteId) return;

    const conn = this.peer.connect(remoteId);
    this.setupConnection(conn);
  }

  handleIncomingConnection(conn) {
    this.setupConnection(conn);
  }

  setupConnection(conn) {
    const peerColor = this.peerColors[this.colorIndex % this.peerColors.length];
    this.colorIndex++;

    conn.on('open', () => {
      this.connections.set(conn.peer, { conn, color: peerColor });
      this.updateConnectionUI();
      this.showNotification(`User connected: ${conn.peer.substring(0, 8)}...`, 'success');

      // Send current scene state to new peer
      if (this.isHost) {
        this.sendSceneState(conn);
      }
    });

    conn.on('data', (data) => {
      this.handlePeerMessage(data, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.updateConnectionUI();
      this.showNotification('User disconnected', 'info');
    });
  }

  sendSceneState(conn) {
    const sceneData = {
      type: 'SCENE_STATE',
      objects: this.studio.sceneObjects.map(obj => ({
        id: obj.id,
        type: obj.type,
        position: obj.entity.getAttribute('position'),
        rotation: obj.entity.getAttribute('rotation'),
        scale: obj.entity.getAttribute('scale')
      }))
    };
    conn.send(sceneData);
  }

  broadcast(message) {
    this.connections.forEach(({ conn }) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  handlePeerMessage(data, peerId) {
    switch(data.type) {
      case 'SCENE_STATE':
        this.studio.newScene();
        data.objects.forEach(obj => {
          this.studio.placeAsset(obj.type, obj.position);
        });
        break;

      case 'ADD_OBJECT':
        this.studio.placeAsset(data.assetType, data.position);
        break;

      case 'MOVE_OBJECT':
        const obj = this.studio.sceneObjects.find(o => o.id === data.objectId);
        if (obj) {
          obj.entity.setAttribute('position', data.position);
          obj.position = data.position;
        }
        break;

      case 'DELETE_OBJECT':
        const delObj = this.studio.sceneObjects.find(o => o.id === data.objectId);
        if (delObj) {
          this.studio.deleteObject(delObj);
        }
        break;

      case 'CURSOR_MOVE':
        this.updatePeerCursor(peerId, data.position);
        break;
    }
  }

  updatePeerCursor(peerId, position) {
    let cursor = document.getElementById(`peer-cursor-${peerId}`);

    if (!cursor) {
      const peerData = this.connections.get(peerId);
      cursor = document.createElement('a-sphere');
      cursor.setAttribute('id', `peer-cursor-${peerId}`);
      cursor.setAttribute('radius', '0.1');
      cursor.setAttribute('color', peerData?.color || '#FF6B6B');
      cursor.setAttribute('opacity', '0.5');
      this.studio.scene.appendChild(cursor);
    }

    if (position) {
      cursor.setAttribute('position', position);
    }
  }

  updateConnectionUI() {
    const statusEl = document.getElementById('p2p-status');
    const idEl = document.getElementById('p2p-id');
    const countEl = document.getElementById('peer-count');

    if (statusEl) {
      statusEl.textContent = this.peerId ? '🟢 Connected' : '🔴 Offline';
      statusEl.className = this.peerId ? 'status-online' : 'status-offline';
    }

    if (idEl && this.peerId) {
      idEl.textContent = this.peerId.substring(0, 12) + '...';
      idEl.title = this.peerId;
    }

    if (countEl) {
      countEl.textContent = this.connections.size;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `p2p-notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
      color: #000;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  disconnect() {
    this.connections.forEach(({ conn }) => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
    }
    this.updateConnectionUI();
  }
}

class ConversationStudio {
  constructor() {
    this.scene = document.querySelector('#main-scene');
    this.sceneObjects = [];
    this.selectedObject = null;
    this.placementMode = null;
    this.recording = false;
    this.recordingStartTime = 0;
    this.traceEvents = [];
    this.playbackInterval = null;
    this.uploadedAssets = new Map();

    this.init();
  }

  init() {
    this.setupToolbox();
    this.setupInspector();
    this.setupTimeline();
    this.setupRecording();
    this.setupFileUpload();
    this.setupScene();
    this.setupNavigation();
    this.setupP2P();
  }

  setupNavigation() {
    const cameraRig = document.getElementById('camera-rig');
    if (cameraRig) {
      this.navigator = new CameraNavigator(cameraRig);
      console.log('Navigation controls initialized: WASD, Mouse drag, Scroll, Touch');
    }
  }

  setupP2P() {
    this.p2p = new P2PManager(this);
    this.p2p.init();

    // Create Room button
    const createBtn = document.getElementById('btn-create-room');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.p2p.createRoom();
      });
    }

    // Join Room button
    const joinBtn = document.getElementById('btn-join-room');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        const remoteId = prompt('Enter Room ID to join:');
        if (remoteId) {
          this.p2p.joinRoom(remoteId);
        }
      });
    }

    // Disconnect button
    const disconnectBtn = document.getElementById('btn-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        this.p2p.disconnect();
      });
    }

    // Copy ID button
    const copyBtn = document.getElementById('btn-copy-id');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (this.p2p.peerId) {
          navigator.clipboard.writeText(this.p2p.peerId);
          this.p2p.showNotification('Room ID copied to clipboard!', 'success');
        }
      });
    }
  }

  // ===== TOOLBOX SETUP =====
  setupToolbox() {
    // Asset buttons
    document.querySelectorAll('.asset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const assetType = btn.dataset.asset;
        this.enterPlacementMode(assetType);
      });
    });
  }

  enterPlacementMode(assetType) {
    this.placementMode = assetType;
    document.getElementById('placement-hint').style.display = 'block';

    // Highlight active button
    document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-asset="${assetType}"]`).classList.add('active');

    this.logEvent('ENTER_PLACEMENT_MODE', { assetType });
  }

  exitPlacementMode() {
    this.placementMode = null;
    document.getElementById('placement-hint').style.display = 'none';
    document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active'));
  }

  // ===== SCENE SETUP =====
  setupScene() {
    // Listen for clicks in scene
    this.scene.addEventListener('click', (evt) => {
      if (this.placementMode && evt.detail.intersection) {
        const point = evt.detail.intersection.point;
        this.placeAsset(this.placementMode, point);
        this.exitPlacementMode();
      }
    });

    // Make ground plane placeable
    const ground = document.createElement('a-plane');
    ground.setAttribute('position', '0 0 0');
    ground.setAttribute('rotation', '-90 0 0');
    ground.setAttribute('width', '50');
    ground.setAttribute('height', '50');
    ground.setAttribute('color', '#7BC8A4');
    ground.setAttribute('class', 'placeable');
    ground.setAttribute('visible', 'true');
    this.scene.appendChild(ground);
  }

  // ===== ASSET PLACEMENT =====
  placeAsset(type, position) {
    let entity;
    const id = `obj-${Date.now()}`;

    switch(type) {
      case 'solomon':
        entity = this.createCharacter('Solomon', '#FFD700', position);
        break;
      case 'solon':
        entity = this.createCharacter('Solon', '#7777FF', position);
        break;
      case 'ibn':
        entity = this.createCharacter('Ibn Khaldun', '#66CC66', position);
        break;
      case 'gate':
        entity = this.createGate(position);
        break;
      case 'light':
        entity = this.createLight(position);
        break;
      case 'text':
        entity = this.createText(position);
        break;
      case 'box':
        entity = this.createPrimitive('box', position);
        break;
      case 'sphere':
        entity = this.createPrimitive('sphere', position);
        break;
      case 'cylinder':
        entity = this.createPrimitive('cylinder', position);
        break;
      case 'plane':
        entity = this.createPrimitive('plane', position);
        break;
      default:
        return;
    }

    entity.setAttribute('id', id);
    entity.classList.add('scene-object');
    this.scene.appendChild(entity);

    const obj = {
      id,
      type,
      entity,
      position: { ...position },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    };

    this.sceneObjects.push(obj);
    this.updateInspector();
    this.updateStats();
    this.logEvent('ADD_OBJECT', { id, type, position });

    // Broadcast to peers
    if (this.p2p && this.p2p.connections.size > 0) {
      this.p2p.broadcast({
        type: 'ADD_OBJECT',
        assetType: type,
        position
      });
    }
  }

  createCharacter(name, color, pos) {
    const entity = document.createElement('a-entity');

    const box = document.createElement('a-box');
    box.setAttribute('position', `${pos.x} ${pos.y + 1.8} ${pos.z}`);
    box.setAttribute('color', color);
    box.setAttribute('scale', '0.5 2 0.3');

    const text = document.createElement('a-text');
    text.setAttribute('value', name);
    text.setAttribute('align', 'center');
    text.setAttribute('position', '0 1.2 0.2');
    text.setAttribute('scale', '0.7 0.7 0.7');
    box.appendChild(text);

    entity.appendChild(box);
    return entity;
  }

  createGate(pos) {
    const entity = document.createElement('a-box');
    entity.setAttribute('position', `${pos.x} ${pos.y + 2} ${pos.z}`);
    entity.setAttribute('scale', '5 4 0.5');
    entity.setAttribute('color', '#8B7355');
    return entity;
  }

  createLight(pos) {
    const entity = document.createElement('a-entity');
    entity.setAttribute('light', 'type: point; intensity: 1; color: #FFD700');
    entity.setAttribute('position', `${pos.x} ${pos.y + 2} ${pos.z}`);

    // Visual indicator
    const sphere = document.createElement('a-sphere');
    sphere.setAttribute('radius', '0.2');
    sphere.setAttribute('color', '#FFFF00');
    sphere.setAttribute('material', 'emissive: #FFFF00; emissiveIntensity: 0.5');
    entity.appendChild(sphere);

    return entity;
  }

  createText(pos) {
    const entity = document.createElement('a-text');
    entity.setAttribute('value', 'Edit Me');
    entity.setAttribute('position', `${pos.x} ${pos.y + 1} ${pos.z}`);
    entity.setAttribute('color', '#FFD700');
    entity.setAttribute('align', 'center');
    return entity;
  }

  createPrimitive(type, pos) {
    const entity = document.createElement(`a-${type}`);
    entity.setAttribute('position', `${pos.x} ${pos.y + 1} ${pos.z}`);
    entity.setAttribute('color', '#FF6B6B');

    if (type === 'plane') {
      entity.setAttribute('rotation', '-90 0 0');
      entity.setAttribute('width', '2');
      entity.setAttribute('height', '2');
    }

    return entity;
  }

  // ===== FILE UPLOAD =====
  setupFileUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    uploadZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });
  }

  handleFiles(files) {
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();

      if (['gltf', 'glb'].includes(ext)) {
        this.loadGLTFAsset(file);
      } else if (ext === 'obj') {
        this.loadOBJAsset(file);
      } else if (ext === 'svg') {
        this.loadSVGAsset(file);
      } else if (['mp4', 'wav'].includes(ext)) {
        this.loadMediaAsset(file);
      }

      this.logEvent('UPLOAD_FILE', { filename: file.name, type: ext, size: file.size });
    }
  }

  loadGLTFAsset(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      this.uploadedAssets.set(file.name, { type: 'gltf', url });

      // Add to toolbox
      const btn = document.createElement('button');
      btn.className = 'asset-btn';
      btn.textContent = `📦 ${file.name}`;
      btn.dataset.asset = `custom-${file.name}`;
      btn.addEventListener('click', () => {
        this.placementMode = file.name;
        this.enterPlacementMode(file.name);
      });
      document.querySelector('.panel-section').appendChild(btn);
    };
    reader.readAsDataURL(file);
  }

  loadOBJAsset(file) {
    // Similar to glTF but for OBJ
    this.uploadedAssets.set(file.name, { type: 'obj', file });
  }

  loadSVGAsset(file) {
    // Load SVG as texture or extruded shape
    this.uploadedAssets.set(file.name, { type: 'svg', file });
  }

  loadMediaAsset(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedAssets.set(file.name, { type: 'media', url: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  // ===== INSPECTOR =====
  setupInspector() {
    // Transform controls
    ['pos-x', 'pos-y', 'pos-z', 'rot-y', 'scale'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        if (this.selectedObject) {
          this.updateObjectTransform();
        }
      });
    });
  }

  updateInspector() {
    const list = document.getElementById('object-list');

    if (this.sceneObjects.length === 0) {
      list.innerHTML = '<div style="color: #888; font-size: 12px; text-align: center; padding: 20px;">No objects in scene</div>';
      return;
    }

    list.innerHTML = '';
    this.sceneObjects.forEach(obj => {
      const item = document.createElement('div');
      item.className = 'object-item';
      if (obj === this.selectedObject) item.classList.add('selected');

      item.innerHTML = `
        <button class="delete-btn">×</button>
        <div class="object-name">${obj.type}</div>
        <div class="object-type">${obj.id}</div>
      `;

      item.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteObject(obj);
      });

      item.addEventListener('click', () => this.selectObject(obj));
      list.appendChild(item);
    });
  }

  selectObject(obj) {
    this.selectedObject = obj;
    document.getElementById('transform-panel').style.display = 'block';

    // Update transform inputs
    const pos = obj.entity.getAttribute('position');
    document.getElementById('pos-x').value = pos.x.toFixed(2);
    document.getElementById('pos-y').value = pos.y.toFixed(2);
    document.getElementById('pos-z').value = pos.z.toFixed(2);

    const rot = obj.entity.getAttribute('rotation');
    document.getElementById('rot-y').value = rot.y.toFixed(0);

    const scale = obj.entity.getAttribute('scale');
    document.getElementById('scale').value = scale.x.toFixed(2);

    this.updateInspector();
    this.logEvent('SELECT_OBJECT', { id: obj.id });
  }

  updateObjectTransform() {
    if (!this.selectedObject) return;

    const x = parseFloat(document.getElementById('pos-x').value);
    const y = parseFloat(document.getElementById('pos-y').value);
    const z = parseFloat(document.getElementById('pos-z').value);
    const rotY = parseFloat(document.getElementById('rot-y').value);
    const scale = parseFloat(document.getElementById('scale').value);

    this.selectedObject.entity.setAttribute('position', { x, y, z });
    this.selectedObject.entity.setAttribute('rotation', { x: 0, y: rotY, z: 0 });
    this.selectedObject.entity.setAttribute('scale', { x: scale, y: scale, z: scale });

    this.logEvent('TRANSFORM_OBJECT', { id: this.selectedObject.id, position: { x, y, z }, rotation: rotY, scale });

    // Broadcast to peers
    if (this.p2p && this.p2p.connections.size > 0) {
      this.p2p.broadcast({
        type: 'MOVE_OBJECT',
        objectId: this.selectedObject.id,
        position: { x, y, z },
        rotation: { x: 0, y: rotY, z: 0 },
        scale: { x: scale, y: scale, z: scale }
      });
    }
  }

  deleteObject(obj) {
    obj.entity.remove();
    this.sceneObjects = this.sceneObjects.filter(o => o !== obj);
    if (this.selectedObject === obj) {
      this.selectedObject = null;
      document.getElementById('transform-panel').style.display = 'none';
    }
    this.updateInspector();
    this.updateStats();
    this.logEvent('DELETE_OBJECT', { id: obj.id });

    // Broadcast to peers
    if (this.p2p && this.p2p.connections.size > 0) {
      this.p2p.broadcast({
        type: 'DELETE_OBJECT',
        objectId: obj.id
      });
    }
  }

  // ===== RECORDING =====
  setupRecording() {
    document.getElementById('btn-record').addEventListener('click', () => {
      this.toggleRecording();
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      this.exportTrace();
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      this.saveScene();
    });

    document.getElementById('btn-load').addEventListener('click', () => {
      this.loadTrace();
    });

    document.getElementById('btn-new').addEventListener('click', () => {
      if (confirm('Clear scene and start new?')) {
        this.newScene();
      }
    });
  }

  toggleRecording() {
    if (this.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    this.recording = true;
    this.recordingStartTime = Date.now();
    this.traceEvents = [];

    document.getElementById('btn-record').classList.add('recording');
    document.getElementById('btn-record').textContent = '⏹ Stop';
    document.getElementById('recording-info').style.display = 'block';

    // Update recording time
    this.recordingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      document.getElementById('rec-time').textContent = `${mins}:${secs}`;
    }, 1000);

    this.logEvent('START_RECORDING', {});
  }

  stopRecording() {
    this.recording = false;
    clearInterval(this.recordingInterval);

    document.getElementById('btn-record').classList.remove('recording');
    document.getElementById('btn-record').textContent = '⏺ Record';
    document.getElementById('recording-info').style.display = 'none';

    this.logEvent('STOP_RECORDING', { duration: (Date.now() - this.recordingStartTime) / 1000 });

    alert(`Recording stopped!\n${this.traceEvents.length} events captured.`);
  }

  logEvent(type, data) {
    const event = {
      timestamp: Date.now(),
      type,
      data
    };

    if (this.recording) {
      event.recordingTime = (Date.now() - this.recordingStartTime) / 1000;
      this.traceEvents.push(event);
    }

    this.updateStats();
  }

  // ===== TIMELINE =====
  setupTimeline() {
    document.getElementById('play-btn').addEventListener('click', () => this.playTrace());
    document.getElementById('pause-btn').addEventListener('click', () => this.pauseTrace());
    document.getElementById('stop-btn').addEventListener('click', () => this.stopTrace());
  }

  playTrace() {
    if (this.traceEvents.length === 0) {
      alert('No recorded events to play');
      return;
    }

    let eventIndex = 0;
    const startTime = Date.now();

    this.playbackInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      document.getElementById('current-time').textContent = elapsed.toFixed(2);

      // Update playhead
      const playhead = document.getElementById('playhead');
      const maxTime = this.traceEvents[this.traceEvents.length - 1].recordingTime;
      const position = (elapsed / maxTime) * 100;
      playhead.style.left = `${position}%`;

      // Replay events
      while (eventIndex < this.traceEvents.length &&
             this.traceEvents[eventIndex].recordingTime <= elapsed) {
        this.replayEvent(this.traceEvents[eventIndex]);
        eventIndex++;
      }

      if (eventIndex >= this.traceEvents.length) {
        this.stopTrace();
      }
    }, 100);
  }

  pauseTrace() {
    clearInterval(this.playbackInterval);
  }

  stopTrace() {
    clearInterval(this.playbackInterval);
    document.getElementById('current-time').textContent = '0.00';
    document.getElementById('playhead').style.left = '0';
  }

  replayEvent(event) {
    console.log('Replay:', event.type, event.data);
    // Implement event replay logic
  }

  // ===== EXPORT/IMPORT =====
  exportTrace() {
    const trace = {
      version: '1.1',
      created: new Date().toISOString(),
      scene: this.sceneObjects.map(obj => ({
        id: obj.id,
        type: obj.type,
        position: obj.entity.getAttribute('position'),
        rotation: obj.entity.getAttribute('rotation'),
        scale: obj.entity.getAttribute('scale')
      })),
      events: this.traceEvents
    };

    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-trace-${Date.now()}.json`;
    a.click();

    this.logEvent('EXPORT_TRACE', { eventCount: this.traceEvents.length });
  }

  saveScene() {
    const scene = {
      objects: this.sceneObjects.map(obj => ({
        id: obj.id,
        type: obj.type,
        position: obj.entity.getAttribute('position'),
        rotation: obj.entity.getAttribute('rotation'),
        scale: obj.entity.getAttribute('scale')
      }))
    };

    localStorage.setItem('conversation-studio-scene', JSON.stringify(scene));
    alert('Scene saved!');
  }

  loadTrace() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const trace = JSON.parse(evt.target.result);
        this.importTrace(trace);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  importTrace(trace) {
    this.newScene();

    // Rebuild scene
    trace.scene.forEach(obj => {
      this.placeAsset(obj.type, obj.position);
    });

    // Load events
    this.traceEvents = trace.events || [];
    this.updateStats();

    alert(`Trace loaded!\n${trace.scene.length} objects, ${this.traceEvents.length} events`);
  }

  newScene() {
    this.sceneObjects.forEach(obj => obj.entity.remove());
    this.sceneObjects = [];
    this.selectedObject = null;
    this.traceEvents = [];
    this.updateInspector();
    this.updateStats();
    document.getElementById('transform-panel').style.display = 'none';
  }

  updateStats() {
    document.getElementById('object-count').textContent = this.sceneObjects.length;
    document.getElementById('trace-event-count').textContent = this.traceEvents.length;
    document.getElementById('event-count').textContent = this.traceEvents.length;
  }
}

// Initialize studio when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.studio = new ConversationStudio();
});
