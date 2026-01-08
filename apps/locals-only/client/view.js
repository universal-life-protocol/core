// view.js
// Template-based rendering — pure projection, no mutation

import { applyTemplate, projectionToHTML } from "./template.js";
import { findTemplateForRecord } from "./templateManager.js";

/**
 * Render listings using templates
 * Falls back to simple rendering if no template available
 */
export async function renderListings(records, container, templateDB, options = {}) {
  container.innerHTML = "";

  const preferredTemplateRid = options.preferredTemplate || null;

  for (const record of records) {
    try {
      // Find appropriate template
      const templateMatch = await findTemplateForRecord(
        templateDB,
        record.bytes,
        preferredTemplateRid
      );

      let card;

      if (templateMatch) {
        // Render using template
        const projection = applyTemplate(templateMatch.template, record.bytes);

        if (projection) {
          card = createProjectionElement(projection, record);
        } else {
          // Template didn't match record, use fallback
          card = createFallbackElement(record);
        }
      } else {
        // No template available, use fallback
        card = createFallbackElement(record);
      }

      container.appendChild(card);
    } catch (err) {
      console.error("[view] render error:", err);
      const errorCard = createErrorElement(record, err);
      container.appendChild(errorCard);
    }
  }
}

/**
 * Create DOM element from projection
 */
function createProjectionElement(projection, record) {
  const card = document.createElement("div");
  card.className = `listing projection-${projection.layout}`;
  card.dataset.rid = record.rid;

  // Apply accessibility settings
  if (projection.accessibility?.font_scale) {
    card.style.fontSize = `${projection.accessibility.font_scale}em`;
  }

  // Render fields
  for (const field of projection.fields) {
    const fieldEl = document.createElement("div");
    fieldEl.className = "field";

    if (field.emphasized) {
      fieldEl.classList.add("emphasized");
    }
    if (field.deEmphasized) {
      fieldEl.classList.add("de-emphasized");
    }

    // Special handling for title field
    if (field.name === "title") {
      const titleEl = document.createElement("h3");
      titleEl.textContent = field.value;
      fieldEl.appendChild(titleEl);
    }
    // Special handling for price
    else if (field.name === "price") {
      const priceEl = document.createElement("div");
      priceEl.className = "price";
      priceEl.textContent = field.value;
      fieldEl.appendChild(priceEl);
    }
    // Default field rendering
    else {
      const labelEl = document.createElement("span");
      labelEl.className = "field-label";
      labelEl.textContent = `${field.name}: `;

      const valueEl = document.createElement("span");
      valueEl.className = "field-value";
      valueEl.textContent = field.value;

      fieldEl.appendChild(labelEl);
      fieldEl.appendChild(valueEl);
    }

    card.appendChild(fieldEl);
  }

  // Add metadata footer
  const footer = document.createElement("div");
  footer.className = "record-footer";
  footer.innerHTML = `<small class="rid">${record.rid}</small>`;
  card.appendChild(footer);

  return card;
}

/**
 * Create fallback element when no template available
 */
function createFallbackElement(record) {
  const card = document.createElement("div");
  card.className = "listing listing-fallback";
  card.dataset.rid = record.rid;

  const lines = record.bytes.split("\n");
  const title = lines.find(l => l.startsWith("title:")) || "title: (untitled)";

  card.innerHTML = `
    <h3>${escapeHTML(title.replace("title:", "").trim())}</h3>
    <pre>${escapeHTML(record.bytes)}</pre>
    <small class="rid">${record.rid}</small>
  `;

  return card;
}

/**
 * Create error element when rendering fails
 */
function createErrorElement(record, error) {
  const card = document.createElement("div");
  card.className = "listing listing-error";
  card.dataset.rid = record.rid;

  card.innerHTML = `
    <h3>Render Error</h3>
    <p class="error-message">${escapeHTML(error.message)}</p>
    <small class="rid">${record.rid}</small>
  `;

  return card;
}

/**
 * Escape HTML to prevent injection
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Render a single record with a specific template
 */
export async function renderRecord(record, template, container) {
  try {
    const projection = applyTemplate(template, record.bytes);

    if (projection) {
      const element = createProjectionElement(projection, record);
      container.appendChild(element);
    } else {
      const fallback = createFallbackElement(record);
      container.appendChild(fallback);
    }
  } catch (err) {
    console.error("[view] render error:", err);
    const errorElement = createErrorElement(record, err);
    container.appendChild(errorElement);
  }
}
