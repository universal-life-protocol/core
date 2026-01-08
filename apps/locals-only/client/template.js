// template.js
// Template validation, composition, and application
// Templates are reproducible projections, not executable code

import { sha256, canonicalize } from "./record.js";

/**
 * Validates a template record structure
 * Ensures no executable content, only declarative projection rules
 */
export function validateTemplate(templateBytes) {
  const lines = templateBytes.split("\n").filter(line => line.trim());
  const parsed = parseTemplate(templateBytes);

  // Required fields
  if (!parsed.type || parsed.type !== "template") {
    throw new Error("Template must have type: template");
  }
  if (!parsed.name) {
    throw new Error("Template must have a name");
  }
  if (!parsed.applies_to?.type) {
    throw new Error("Template must specify applies_to.type");
  }

  // Forbidden patterns (security)
  const forbidden = [
    "script", "eval", "function", "=>", "javascript:",
    "onerror", "onclick", "onload", "__proto__",
    "constructor", "prototype"
  ];

  const fullText = templateBytes.toLowerCase();
  for (const pattern of forbidden) {
    if (fullText.includes(pattern)) {
      throw new Error(`Forbidden pattern in template: ${pattern}`);
    }
  }

  return parsed;
}

/**
 * Parse template from canonical text
 */
export function parseTemplate(templateBytes) {
  const lines = templateBytes.split("\n");
  const template = {
    type: null,
    name: null,
    applies_to: {},
    select: { required: [], optional: [], forbidden: [] },
    project: { order: [], collapse_empty: true, normalize_whitespace: true },
    render: { layout: "text", emphasize: [], de_emphasize: [], hide: [] },
    accessibility: {},
    metadata: {},
    extends: null
  };

  let currentSection = null;
  let currentSubsection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Top-level fields
    if (line.startsWith("type:")) {
      template.type = line.split(":")[1].trim();
    } else if (line.startsWith("name:")) {
      template.name = line.split(":")[1].trim();
    } else if (line.startsWith("extends:")) {
      template.extends = line.split(":")[1].trim();
    }
    // Sections
    else if (line.startsWith("applies_to:")) {
      currentSection = "applies_to";
    } else if (line.startsWith("select:")) {
      currentSection = "select";
    } else if (line.startsWith("project:")) {
      currentSection = "project";
    } else if (line.startsWith("render:")) {
      currentSection = "render";
    } else if (line.startsWith("accessibility:")) {
      currentSection = "accessibility";
    } else if (line.startsWith("metadata:")) {
      currentSection = "metadata";
    }
    // Subsections and values
    else if (trimmed && currentSection) {
      const indent = line.search(/\S/);

      if (indent === 2) {
        // Subsection
        const [key, value] = trimmed.split(":").map(s => s.trim());

        if (currentSection === "applies_to") {
          template.applies_to[key] = value;
        } else if (currentSection === "select") {
          currentSubsection = key;
          template.select[key] = [];
        } else if (currentSection === "project") {
          currentSubsection = key;
          if (key === "order") {
            template.project.order = [];
          } else {
            template.project[key] = value === "true";
          }
        } else if (currentSection === "render") {
          if (key === "layout") {
            template.render.layout = value;
          } else {
            currentSubsection = key;
            template.render[key] = [];
          }
        } else if (currentSection === "accessibility") {
          const numValue = parseFloat(value);
          template.accessibility[key] = isNaN(numValue) ? (value === "true") : numValue;
        } else if (currentSection === "metadata") {
          template.metadata[key] = value;
        }
      } else if (indent === 4 && currentSubsection) {
        // List item
        const value = trimmed.replace(/^-\s*/, "").replace(/[\[\]]/g, "");

        if (currentSection === "select" && template.select[currentSubsection]) {
          template.select[currentSubsection].push(value);
        } else if (currentSection === "project" && currentSubsection === "order") {
          template.project.order.push(value);
        } else if (currentSection === "render" && template.render[currentSubsection]) {
          template.render[currentSubsection].push(value);
        }
      }
    }
  }

  return template;
}

/**
 * Compose templates (base + override)
 * Override can reorder, hide, emphasize but cannot relax security
 */
export function composeTemplates(baseTemplate, overrideTemplate) {
  // Validate composition rules
  if (overrideTemplate.applies_to?.type &&
      overrideTemplate.applies_to.type !== baseTemplate.applies_to.type) {
    throw new Error("Override cannot change applies_to.type");
  }

  const composed = JSON.parse(JSON.stringify(baseTemplate));

  // Merge select (override can only add to forbidden, not remove)
  if (overrideTemplate.select.forbidden.length > 0) {
    composed.select.forbidden = [
      ...new Set([...composed.select.forbidden, ...overrideTemplate.select.forbidden])
    ];
  }

  // Override project rules
  if (overrideTemplate.project.order.length > 0) {
    composed.project.order = overrideTemplate.project.order;
  }
  if (overrideTemplate.project.collapse_empty !== undefined) {
    composed.project.collapse_empty = overrideTemplate.project.collapse_empty;
  }
  if (overrideTemplate.project.normalize_whitespace !== undefined) {
    composed.project.normalize_whitespace = overrideTemplate.project.normalize_whitespace;
  }

  // Override render rules
  if (overrideTemplate.render.layout) {
    composed.render.layout = overrideTemplate.render.layout;
  }
  if (overrideTemplate.render.emphasize.length > 0) {
    composed.render.emphasize = overrideTemplate.render.emphasize;
  }
  if (overrideTemplate.render.de_emphasize.length > 0) {
    composed.render.de_emphasize = overrideTemplate.render.de_emphasize;
  }
  if (overrideTemplate.render.hide.length > 0) {
    composed.render.hide = [...composed.render.hide, ...overrideTemplate.render.hide];
  }

  // Merge accessibility (override can only strengthen, not weaken)
  if (overrideTemplate.accessibility.min_contrast) {
    composed.accessibility.min_contrast = Math.max(
      composed.accessibility.min_contrast || 0,
      overrideTemplate.accessibility.min_contrast
    );
  }
  if (overrideTemplate.accessibility.font_scale) {
    composed.accessibility.font_scale = Math.max(
      composed.accessibility.font_scale || 1,
      overrideTemplate.accessibility.font_scale
    );
  }
  if (overrideTemplate.accessibility.alt_text_required) {
    composed.accessibility.alt_text_required = true;
  }

  return composed;
}

/**
 * Apply template to a record
 * Returns a projection object (not HTML, not executable)
 */
export function applyTemplate(template, recordBytes) {
  const record = parseRecord(recordBytes);

  // Check if template applies
  if (template.applies_to.type && record.type !== template.applies_to.type) {
    return null;
  }

  // Validate required fields
  for (const field of template.select.required) {
    if (!record[field]) {
      return null; // Record doesn't match template
    }
  }

  // Check forbidden fields
  for (const field of template.select.forbidden) {
    if (record[field]) {
      return null; // Record contains forbidden field
    }
  }

  // Project fields in order
  const projection = {
    fields: [],
    layout: template.render.layout,
    emphasis: {},
    accessibility: template.accessibility
  };

  for (const fieldName of template.project.order) {
    let value = record[fieldName];

    if (!value && template.project.collapse_empty) {
      continue; // Skip empty fields
    }

    if (value && template.project.normalize_whitespace) {
      value = value.trim().replace(/\s+/g, " ");
    }

    // Check if field should be hidden
    if (template.render.hide.includes(fieldName)) {
      continue;
    }

    const field = {
      name: fieldName,
      value: value || "",
      emphasized: template.render.emphasize.includes(fieldName),
      deEmphasized: template.render.de_emphasize.includes(fieldName)
    };

    projection.fields.push(field);
  }

  return projection;
}

/**
 * Parse record bytes into key-value pairs
 */
function parseRecord(recordBytes) {
  const lines = recordBytes.split("\n");
  const record = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      record[key] = value;
    }
  }

  return record;
}

/**
 * Create a template record (content-addressed)
 */
export async function createTemplateRecord(templateText) {
  const canonical = canonicalize(templateText);
  const bytes = new TextEncoder().encode(canonical);
  const hash = await sha256(bytes);

  return {
    rid: `sha256:${hash}`,
    bytes: canonical,
    created: new Date().toISOString(),
    type: "template"
  };
}

/**
 * Serialize projection to HTML (safe, no execution)
 */
export function projectionToHTML(projection) {
  if (!projection) return "";

  const layoutClass = `layout-${projection.layout}`;
  const a11yStyles = [];

  if (projection.accessibility?.min_contrast) {
    a11yStyles.push(`--min-contrast: ${projection.accessibility.min_contrast}`);
  }
  if (projection.accessibility?.font_scale) {
    a11yStyles.push(`font-size: ${projection.accessibility.font_scale}em`);
  }

  const styleAttr = a11yStyles.length > 0 ? ` style="${a11yStyles.join("; ")}"` : "";

  let html = `<div class="projection ${layoutClass}"${styleAttr}>`;

  for (const field of projection.fields) {
    const fieldClass = [
      "field",
      `field-${field.name}`,
      field.emphasized ? "emphasized" : "",
      field.deEmphasized ? "de-emphasized" : ""
    ].filter(Boolean).join(" ");

    const escapedValue = escapeHTML(field.value);
    html += `<div class="${fieldClass}"><span class="field-name">${escapeHTML(field.name)}:</span> <span class="field-value">${escapedValue}</span></div>`;
  }

  html += "</div>";
  return html;
}

/**
 * Escape HTML to prevent injection
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
