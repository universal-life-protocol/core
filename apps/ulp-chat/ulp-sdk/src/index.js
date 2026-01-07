import crypto from "node:crypto";

const DEFAULT_TITLE = "ULP v2.0 Projection";

function hashHex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function parsePolicy(traceBytes) {
  const policy = {};
  const lines = traceBytes.toString("utf8").split("\n");
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [tag, key, value] = parts;
    if (tag === "POLICY") {
      if (key === "e8l") policy.e8l = value;
      else if (key === "e8r") policy.e8r = value;
      else if (key === "chirality") policy.chirality = value;
      else if (key === "rid") policy.rid = value;
    } else if (tag === "GEOMETRY") {
      if (key === "projective") policy.projective = value;
      else if (key === "causality") policy.causality = value;
      else if (key === "incidence") policy.incidence = value;
    } else if (tag === "REPLICA" && key === "slots") {
      try {
        policy.slots = JSON.parse(value);
      } catch (_) {
        /* ignore */
      }
    }
  }
  return Object.keys(policy).length ? policy : null;
}

export function recordFromTrace(traceBytes) {
  const rid = hashHex(traceBytes);
  return {
    rid,
    size: traceBytes.length,
    policy: parsePolicy(traceBytes),
  };
}

function normalizeRecord(input) {
  if (!input || typeof input !== "object") {
    throw new Error("record is required");
  }
  if (input.bytes) {
    return recordFromTrace(input.bytes);
  }
  if (!input.rid || typeof input.rid !== "string") {
    throw new Error("record.rid is required");
  }
  const size = typeof input.size === "number" ? input.size : 0;
  return {
    rid: input.rid,
    size,
    policy: input.policy || null,
  };
}

function card(label, value, key, selected) {
  return {
    key,
    label,
    value: value == null || value === "" ? "-" : String(value),
    selected: Boolean(selected),
  };
}

export function projectionSchema(record, options = {}) {
  const normalized = normalizeRecord(record);
  const selectedFields = new Set(
    String(options.fields || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const hasSelection = selectedFields.size > 0;
  const isSelected = (key) => (hasSelection ? selectedFields.has(key) : false);

  const policy = normalized.policy || {};
  const slots = Array.isArray(policy.slots) ? policy.slots.join(", ") : "";

  const cards = [
    card("RID", normalized.rid, "rid", isSelected("rid")),
    card("Size (bytes)", normalized.size, "size", isSelected("size")),
    card("Chirality", policy.chirality, "chirality", isSelected("chirality")),
    card("Projective", policy.projective, "projective", isSelected("projective")),
    card("Causality", policy.causality, "causality", isSelected("causality")),
    card("Incidence", policy.incidence, "incidence", isSelected("incidence")),
    card("Replica Slots", slots, "slots", isSelected("slots")),
  ];

  return {
    type: "projection",
    variant: "modal-cards",
    title: options.title || DEFAULT_TITLE,
    record: {
      rid: normalized.rid,
      size: normalized.size,
      policy: normalized.policy,
    },
    selectedFields: Array.from(selectedFields),
    cards,
  };
}

export function projectionHTML(record, options = {}) {
  const schema = projectionSchema(record, options);
  const cardsHtml = schema.cards
    .map((c) => {
      const cls = c.selected ? "card selected" : "card";
      return `<div class="${cls}"><div class="label">${c.label}</div><div class="value">${c.value}</div></div>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${schema.title}</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; background: #f6f4ef; color: #1a1a1a; }
      .overlay { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
      .modal { background: #fffdf8; border: 1px solid #e7e0d4; border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.12); max-width: 920px; width: 100%; padding: 28px; }
      h1 { margin: 0 0 12px; font-size: 20px; letter-spacing: 0.3px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
      .card { background: #fbf7ef; border: 1px solid #eadfcd; border-radius: 14px; padding: 14px; min-height: 80px; }
      .card.selected { outline: 2px solid #2f6a4f; background: #f0f7f1; }
      .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6c6257; margin-bottom: 6px; }
      .value { font-size: 14px; word-break: break-all; }
      .note { margin-top: 12px; font-size: 12px; color: #6c6257; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #1a1a1a; color: #fff; font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <h1>${schema.title} <span class="badge">HTML</span></h1>
        <div class="grid">${cardsHtml}</div>
        <div class="note">Use ?fields=rid,chirality,projective to focus cards.</div>
      </div>
    </div>
  </body>
</html>`;
}
