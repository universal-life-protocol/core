// main.js
// App bootstrap with template support

import { connectMQTT, publishRecord, publishTemplate } from "./mqtt.js";
import { verifyRecord, createRecord } from "./record.js";
import { openDB, storeRecord, getAllRecords } from "./index.js";
import { renderListings } from "./view.js";
import { publishListing } from "./publish.js";
import { openTemplateDB, storeTemplate, loadBuiltInTemplates, getAllTemplates } from "./templateManager.js";
import { validateTemplate, createTemplateRecord } from "./template.js";
import { loadSampleData, clearAllRecords, getRecordCount } from "./sampleData.js";

const broker = "wss://test.mosquitto.org:8081";
const container = document.getElementById("listings");

// Initialize databases
const db = await openDB();
const templateDB = await openTemplateDB();

// Load built-in templates
console.log("[main] loading built-in templates...");
const builtInTemplates = await loadBuiltInTemplates(templateDB);
console.log("[main] loaded templates:", builtInTemplates);

// Connect to MQTT with template subscription
const client = connectMQTT(broker, { subscribeToTemplates: true });

// Track current template selection
let currentTemplateRid = null;

// Update record count display
async function updateRecordCount() {
  const count = await getRecordCount(db);
  const countEl = document.getElementById('record-count');
  if (countEl) {
    countEl.textContent = `${count} listing${count !== 1 ? 's' : ''}`;
  }
}

// Load existing records on startup
const all = await getAllRecords(db);
await renderListings(all, container, templateDB, {
  preferredTemplate: currentTemplateRid
});
await updateRecordCount();

// Listen for new records and templates from MQTT
client.on("message", async (topic, payload) => {
  try {
    const record = JSON.parse(payload.toString());

    // Handle template records
    if (topic.startsWith("locals/template")) {
      if (record.type === "template" && await verifyRecord(record)) {
        try {
          await storeTemplate(templateDB, record);
          console.log("[mqtt] received template:", record.rid);

          // Optionally re-render with new template
          const all = await getAllRecords(db);
          await renderListings(all, container, templateDB, {
            preferredTemplate: currentTemplateRid
          });
        } catch (err) {
          console.error("[mqtt] template validation failed:", err);
        }
      }
    }
    // Handle listing/market records
    else if (topic.startsWith("locals/market")) {
      if (await verifyRecord(record)) {
        await storeRecord(db, record);
        const all = await getAllRecords(db);
        await renderListings(all, container, templateDB, {
          preferredTemplate: currentTemplateRid
        });
      }
    }
  } catch (err) {
    console.error("[mqtt] message handling error:", err);
  }
});

// Wire up the post button
document.getElementById("post").addEventListener("click", async () => {
  const textarea = document.getElementById("new");
  const text = textarea.value.trim();

  if (text) {
    await publishListing(client, text);
    textarea.value = "";
  }
});

// Wire up template selector (if present)
const templateSelector = document.getElementById("template-selector");
if (templateSelector) {
  // Populate template options
  const templates = await getAllTemplates(templateDB);
  templates.forEach(tpl => {
    try {
      const option = document.createElement("option");
      option.value = tpl.rid;
      option.textContent = tpl.bytes.split("\n").find(l => l.startsWith("name:"))?.split(":")[1]?.trim() || tpl.rid.substring(0, 16);
      templateSelector.appendChild(option);
    } catch {}
  });

  // Handle template selection
  templateSelector.addEventListener("change", async (e) => {
    currentTemplateRid = e.target.value || null;
    const all = await getAllRecords(db);
    await renderListings(all, container, templateDB, {
      preferredTemplate: currentTemplateRid
    });
  });
}

// Publish template button (if present)
const publishTemplateBtn = document.getElementById("publish-template");
if (publishTemplateBtn) {
  publishTemplateBtn.addEventListener("click", async () => {
    const textarea = document.getElementById("template-text");
    const text = textarea.value.trim();

    if (text) {
      try {
        // Validate and create template record
        validateTemplate(text);
        const templateRecord = await createTemplateRecord(text);

        // Store locally
        await storeTemplate(templateDB, templateRecord);

        // Publish to network
        publishTemplate(client, templateRecord);

        console.log("[main] published template:", templateRecord.rid);
        textarea.value = "";

        // Refresh template selector
        if (templateSelector) {
          const option = document.createElement("option");
          option.value = templateRecord.rid;
          option.textContent = text.split("\n").find(l => l.startsWith("name:"))?.split(":")[1]?.trim() || templateRecord.rid.substring(0, 16);
          templateSelector.appendChild(option);
        }
      } catch (err) {
        alert(`Template validation failed: ${err.message}`);
        console.error("[main] template error:", err);
      }
    }
  });
}

// Load sample data button
const loadSampleBtn = document.getElementById("load-sample");
if (loadSampleBtn) {
  loadSampleBtn.addEventListener("click", async () => {
    console.log("[main] Load Sample Data button clicked");
    try {
      loadSampleBtn.disabled = true;
      loadSampleBtn.textContent = "Loading...";
      console.log("[main] Starting sample data load...");

      await loadSampleData(db);
      console.log("[main] Sample data loaded, getting all records...");

      const all = await getAllRecords(db);
      console.log("[main] Got", all.length, "records, rendering...");

      await renderListings(all, container, templateDB, {
        preferredTemplate: currentTemplateRid
      });
      console.log("[main] Rendered, updating count...");

      await updateRecordCount();
      console.log("[main] Count updated");

      loadSampleBtn.textContent = "Load Sample Data";
      loadSampleBtn.disabled = false;

      console.log("[main] sample data loaded successfully");
      alert(`Loaded ${all.length} sample listings!`);
    } catch (err) {
      console.error("[main] failed to load sample data:", err);
      console.error("[main] error stack:", err.stack);
      alert(`Failed to load sample data: ${err.message}`);
      loadSampleBtn.textContent = "Load Failed";
      setTimeout(() => {
        loadSampleBtn.textContent = "Load Sample Data";
        loadSampleBtn.disabled = false;
      }, 2000);
    }
  });
  console.log("[main] Load Sample Data button listener attached");
} else {
  console.error("[main] Load Sample Data button not found!");
}

// Clear all data button
const clearDataBtn = document.getElementById("clear-data");
if (clearDataBtn) {
  clearDataBtn.addEventListener("click", async () => {
    if (!confirm("Clear all listings? This cannot be undone.")) {
      return;
    }

    try {
      clearDataBtn.disabled = true;
      clearDataBtn.textContent = "Clearing...";

      await clearAllRecords(db);

      container.innerHTML = "";
      await updateRecordCount();

      clearDataBtn.textContent = "Clear All";
      clearDataBtn.disabled = false;

      console.log("[main] all records cleared");
    } catch (err) {
      console.error("[main] failed to clear records:", err);
      clearDataBtn.textContent = "Clear Failed";
      setTimeout(() => {
        clearDataBtn.textContent = "Clear All";
        clearDataBtn.disabled = false;
      }, 2000);
    }
  });
}

// Export for debugging
window.localsOnly = {
  db,
  templateDB,
  client,
  refresh: async () => {
    const all = await getAllRecords(db);
    await renderListings(all, container, templateDB, {
      preferredTemplate: currentTemplateRid
    });
    await updateRecordCount();
  },
  loadSample: () => loadSampleData(db),
  clearAll: () => clearAllRecords(db)
};

console.log("[main] locals-only initialized");
console.log("[main] use window.localsOnly.refresh() to re-render");
