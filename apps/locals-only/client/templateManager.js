// templateManager.js
// Local template storage and retrieval using IndexedDB

import { validateTemplate, parseTemplate, composeTemplates, createTemplateRecord } from "./template.js";

/**
 * Open templates database
 */
export function openTemplateDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("locals-only-templates", 1);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("templates")) {
        db.createObjectStore("templates", { keyPath: "rid" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Store a template record
 */
export async function storeTemplate(db, templateRecord) {
  try {
    // Validate template before storing
    validateTemplate(templateRecord.bytes);

    const tx = db.transaction("templates", "readwrite");
    tx.objectStore("templates").put(templateRecord);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(templateRecord.rid);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("[template] validation failed:", err);
    throw err;
  }
}

/**
 * Get template by RID
 */
export async function getTemplate(db, rid) {
  const tx = db.transaction("templates", "readonly");
  const store = tx.objectStore("templates");

  return new Promise((resolve, reject) => {
    const req = store.get(rid);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all stored templates
 */
export async function getAllTemplates(db) {
  const tx = db.transaction("templates", "readonly");
  const store = tx.objectStore("templates");

  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * Load built-in templates from world/templates/
 */
export async function loadBuiltInTemplates(db) {
  const builtInTemplates = [
    { name: "listing-card-default", file: "/world/templates/listing-card-default.tpl" },
    { name: "listing-text-minimal", file: "/world/templates/listing-text-minimal.tpl" },
    { name: "listing-a11y-highcontrast", file: "/world/templates/listing-a11y-highcontrast.tpl" },
    { name: "listing-list-compact", file: "/world/templates/listing-list-compact.tpl" },
    { name: "listing-vintage", file: "/world/templates/listing-vintage.tpl" },
    { name: "listing-modern-minimal", file: "/world/templates/listing-modern-minimal.tpl" },
    { name: "listing-dark-mode", file: "/world/templates/listing-dark-mode.tpl" },
    { name: "listing-detailed", file: "/world/templates/listing-detailed.tpl" },
    { name: "listing-price-focus", file: "/world/templates/listing-price-focus.tpl" },
    { name: "listing-local-only", file: "/world/templates/listing-local-only.tpl" }
  ];

  const loaded = [];

  for (const tpl of builtInTemplates) {
    try {
      const response = await fetch(tpl.file);
      if (response.ok) {
        const text = await response.text();
        const record = await createTemplateRecord(text);
        await storeTemplate(db, record);
        loaded.push({ name: tpl.name, rid: record.rid });
        console.log(`[template] loaded built-in: ${tpl.name} (${record.rid})`);
      }
    } catch (err) {
      console.warn(`[template] failed to load ${tpl.name}:`, err);
    }
  }

  return loaded;
}

/**
 * Get template with composition support
 */
export async function getComposedTemplate(db, baseRid, overrideRid = null) {
  const baseRecord = await getTemplate(db, baseRid);
  if (!baseRecord) {
    throw new Error(`Base template not found: ${baseRid}`);
  }

  const baseTemplate = parseTemplate(baseRecord.bytes);

  if (!overrideRid) {
    return baseTemplate;
  }

  const overrideRecord = await getTemplate(db, overrideRid);
  if (!overrideRecord) {
    console.warn(`Override template not found: ${overrideRid}, using base only`);
    return baseTemplate;
  }

  const overrideTemplate = parseTemplate(overrideRecord.bytes);
  return composeTemplates(baseTemplate, overrideTemplate);
}

/**
 * Find template for a given record type
 */
export async function findTemplateForRecord(db, recordBytes, preferredRid = null) {
  // Try preferred template first
  if (preferredRid) {
    const template = await getTemplate(db, preferredRid);
    if (template) {
      const parsed = parseTemplate(template.bytes);
      return { rid: preferredRid, template: parsed };
    }
  }

  // Fall back to searching all templates
  const allTemplates = await getAllTemplates(db);
  const record = parseRecordType(recordBytes);

  for (const tpl of allTemplates) {
    try {
      const parsed = parseTemplate(tpl.bytes);
      if (parsed.applies_to?.type === record.type) {
        return { rid: tpl.rid, template: parsed };
      }
    } catch (err) {
      console.warn("[template] invalid template:", tpl.rid);
    }
  }

  return null;
}

/**
 * Parse record to get type
 */
function parseRecordType(recordBytes) {
  const lines = recordBytes.split("\n");
  for (const line of lines) {
    if (line.startsWith("type:")) {
      return { type: line.split(":")[1].trim() };
    }
  }
  return { type: "unknown" };
}

/**
 * Delete template by RID
 */
export async function deleteTemplate(db, rid) {
  const tx = db.transaction("templates", "readwrite");
  tx.objectStore("templates").delete(rid);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
