// Rumsfeld Matrix - Theological Understanding Tool
// Testament Trustee - Speaker for the Unknowable

class TheologicalMatrix {
  constructor() {
    this.matrix = {
      'known-knowns': [],
      'known-unknowns': [],
      'unknown-knowns': [],
      'unknown-unknowns': [] // Always empty, reserved for mystery
    };
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.init();
  }

  init() {
    // Set session ID
    document.getElementById('session-id').value = this.sessionId;

    // Set today's date
    document.getElementById('session-date').value = new Date().toISOString().split('T')[0];

    // Setup drag and drop
    this.setupDragAndDrop();

    // Log initialization
    this.logEvent('SESSION_START', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });

    // Load from localStorage if exists
    this.checkLocalStorage();
  }

  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `testimony-${timestamp}-${random}`;
  }

  setupDragAndDrop() {
    const lists = document.querySelectorAll('.statement-list');

    lists.forEach(list => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        list.style.background = 'rgba(255, 215, 0, 0.1)';
      });

      list.addEventListener('dragleave', (e) => {
        list.style.background = '';
      });

      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.style.background = '';

        const statementId = e.dataTransfer.getData('text/plain');
        const statementEl = document.getElementById(statementId);

        if (statementEl) {
          const fromQuadrant = statementEl.dataset.quadrant;
          const toQuadrant = list.id.replace('-list', '');

          if (fromQuadrant !== toQuadrant) {
            this.moveStatement(statementId, fromQuadrant, toQuadrant);
          }
        }
      });
    });
  }

  addStatement(quadrant) {
    const inputId = quadrant === 'known-knowns' ? 'kk-input' :
                    quadrant === 'known-unknowns' ? 'ku-input' :
                    quadrant === 'unknown-knowns' ? 'uk-input' : null;

    if (!inputId) return;

    const input = document.getElementById(inputId);
    const text = input.value.trim();

    if (!text) return;

    const statement = {
      id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      quadrant: quadrant,
      timestamp: new Date().toISOString()
    };

    this.matrix[quadrant].push(statement);
    this.renderStatement(statement);
    input.value = '';

    this.logEvent('ADD_STATEMENT', {
      quadrant: quadrant,
      text: text,
      statementId: statement.id
    });
  }

  renderStatement(statement) {
    const listId = statement.quadrant === 'known-knowns' ? 'kk-list' :
                   statement.quadrant === 'known-unknowns' ? 'ku-list' :
                   statement.quadrant === 'unknown-knowns' ? 'uk-list' : null;

    if (!listId) return;

    const list = document.getElementById(listId);
    const li = document.createElement('li');
    li.className = 'statement';
    li.id = statement.id;
    li.draggable = true;
    li.dataset.quadrant = statement.quadrant;

    li.innerHTML = `
      <span>${statement.text}</span>
      <button class="delete-btn" onclick="matrix.deleteStatement('${statement.id}', '${statement.quadrant}')">×</button>
    `;

    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', statement.id);
      li.style.opacity = '0.5';
    });

    li.addEventListener('dragend', (e) => {
      li.style.opacity = '1';
    });

    list.appendChild(li);
  }

  moveStatement(statementId, fromQuadrant, toQuadrant) {
    // Find statement in old quadrant
    const index = this.matrix[fromQuadrant].findIndex(s => s.id === statementId);
    if (index === -1) return;

    const statement = this.matrix[fromQuadrant][index];

    // Remove from old quadrant
    this.matrix[fromQuadrant].splice(index, 1);

    // Update quadrant
    statement.quadrant = toQuadrant;
    statement.movedAt = new Date().toISOString();

    // Add to new quadrant
    this.matrix[toQuadrant].push(statement);

    // Update DOM
    const element = document.getElementById(statementId);
    element.dataset.quadrant = toQuadrant;

    const newList = document.getElementById(toQuadrant.replace(toQuadrant, toQuadrant) + '-list');
    const listId = toQuadrant === 'known-knowns' ? 'kk-list' :
                   toQuadrant === 'known-unknowns' ? 'ku-list' :
                   toQuadrant === 'unknown-knowns' ? 'uk-list' : null;

    if (listId) {
      document.getElementById(listId).appendChild(element);
    }

    this.logEvent('MOVE_STATEMENT', {
      statementId: statementId,
      from: fromQuadrant,
      to: toQuadrant,
      text: statement.text
    });
  }

  deleteStatement(statementId, quadrant) {
    const index = this.matrix[quadrant].findIndex(s => s.id === statementId);
    if (index === -1) return;

    const statement = this.matrix[quadrant][index];
    this.matrix[quadrant].splice(index, 1);

    document.getElementById(statementId).remove();

    this.logEvent('DELETE_STATEMENT', {
      statementId: statementId,
      quadrant: quadrant,
      text: statement.text
    });
  }

  logEvent(type, data) {
    this.events.push({
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      type: type,
      data: data
    });
  }

  exportMatrix() {
    const participant = document.getElementById('participant-name').value || 'Anonymous';
    const date = document.getElementById('session-date').value;

    const export_data = {
      participant: participant,
      sessionId: this.sessionId,
      date: date,
      matrix: this.matrix,
      summary: {
        knownKnowns: this.matrix['known-knowns'].length,
        knownUnknowns: this.matrix['known-unknowns'].length,
        unknownKnowns: this.matrix['unknown-knowns'].length
      }
    };

    const blob = new Blob([JSON.stringify(export_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrix-${this.sessionId}.json`;
    a.click();

    this.logEvent('EXPORT_MATRIX', { format: 'json' });
  }

  exportTrace() {
    const participant = document.getElementById('participant-name').value || 'Anonymous';
    const date = document.getElementById('session-date').value;

    // Generate ULP v1.1 compatible trace
    const trace = {
      version: '1.1',
      type: 'theological-testimony',
      created: new Date().toISOString(),
      metadata: {
        participant: participant,
        sessionId: this.sessionId,
        date: date,
        framework: 'rumsfeld-matrix',
        speaker: 'Speaker for the Unknowable'
      },
      matrix: {
        'known-knowns': this.matrix['known-knowns'].map(s => ({
          text: s.text,
          timestamp: s.timestamp
        })),
        'known-unknowns': this.matrix['known-unknowns'].map(s => ({
          text: s.text,
          timestamp: s.timestamp
        })),
        'unknown-knowns': this.matrix['unknown-knowns'].map(s => ({
          text: s.text,
          timestamp: s.timestamp
        })),
        'unknown-unknowns': {
          note: 'Space reserved for mystery and the unknowable',
          speculation: null
        }
      },
      events: this.events,
      hash: this.generateHash(JSON.stringify(this.matrix))
    };

    // Display trace
    const traceOutput = document.getElementById('trace-output');
    const traceContent = document.getElementById('trace-content');
    traceContent.textContent = JSON.stringify(trace, null, 2);
    traceOutput.style.display = 'block';

    // Auto-download
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace-${this.sessionId}.json`;
    a.click();

    this.logEvent('EXPORT_TRACE', { hash: trace.hash });
  }

  generateHash(data) {
    // Simple hash function for demonstration
    // In production, use SHA-256
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  copyTrace() {
    const traceContent = document.getElementById('trace-content');
    navigator.clipboard.writeText(traceContent.textContent).then(() => {
      alert('Trace copied to clipboard!');
    });
  }

  clearMatrix() {
    if (!confirm('Clear all statements? This cannot be undone.')) return;

    this.matrix = {
      'known-knowns': [],
      'known-unknowns': [],
      'unknown-knowns': [],
      'unknown-unknowns': []
    };

    document.getElementById('kk-list').innerHTML = '';
    document.getElementById('ku-list').innerHTML = '';
    document.getElementById('uk-list').innerHTML = '';

    this.logEvent('CLEAR_MATRIX', {});
  }

  saveLocal() {
    const participant = document.getElementById('participant-name').value || 'Anonymous';
    const date = document.getElementById('session-date').value;

    const saveData = {
      participant: participant,
      sessionId: this.sessionId,
      date: date,
      matrix: this.matrix,
      events: this.events,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('theological-matrix', JSON.stringify(saveData));
    alert('Matrix saved locally!');

    this.logEvent('SAVE_LOCAL', {});
  }

  loadLocal() {
    const saved = localStorage.getItem('theological-matrix');
    if (!saved) {
      alert('No saved matrix found.');
      return;
    }

    if (!confirm('Load saved matrix? Current work will be lost.')) return;

    const saveData = JSON.parse(saved);

    document.getElementById('participant-name').value = saveData.participant;
    document.getElementById('session-date').value = saveData.date;

    this.matrix = saveData.matrix;
    this.sessionId = saveData.sessionId;
    this.events = saveData.events || [];

    // Clear and re-render
    document.getElementById('kk-list').innerHTML = '';
    document.getElementById('ku-list').innerHTML = '';
    document.getElementById('uk-list').innerHTML = '';

    Object.keys(this.matrix).forEach(quadrant => {
      if (quadrant !== 'unknown-unknowns') {
        this.matrix[quadrant].forEach(statement => {
          this.renderStatement(statement);
        });
      }
    });

    this.logEvent('LOAD_LOCAL', {});
  }

  checkLocalStorage() {
    const saved = localStorage.getItem('theological-matrix');
    if (saved) {
      if (confirm('Found a saved matrix. Load it?')) {
        this.loadLocal();
      }
    }
  }
}

// Global instance
const matrix = new TheologicalMatrix();

// Global functions for HTML onclick handlers
function addStatement(quadrant) {
  matrix.addStatement(quadrant);
}

function exportMatrix() {
  matrix.exportMatrix();
}

function exportTrace() {
  matrix.exportTrace();
}

function clearMatrix() {
  matrix.clearMatrix();
}

function saveLocal() {
  matrix.saveLocal();
}

function loadLocal() {
  matrix.loadLocal();
}

function copyTrace() {
  matrix.copyTrace();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S = Save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    matrix.saveLocal();
  }

  // Ctrl/Cmd + E = Export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    matrix.exportTrace();
  }
});

// Enter key adds statement
['kk-input', 'ku-input', 'uk-input'].forEach(id => {
  document.getElementById(id).addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const quadrant = id === 'kk-input' ? 'known-knowns' :
                       id === 'ku-input' ? 'known-unknowns' :
                       id === 'uk-input' ? 'unknown-knowns' : null;
      if (quadrant) matrix.addStatement(quadrant);
    }
  });
});
