// record.js
// Canonical record creation + verification

export async function sha256(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function canonicalize(text) {
  // Normalize line endings, trim trailing spaces
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .trim() + "\n";
}

export async function createRecord(text) {
  const canonical = canonicalize(text);
  const bytes = new TextEncoder().encode(canonical);
  const hash = await sha256(bytes);

  return {
    rid: `sha256:${hash}`,
    bytes: canonical,
    created: new Date().toISOString()
  };
}

export async function verifyRecord(record) {
  const bytes = new TextEncoder().encode(record.bytes);
  const hash = await sha256(bytes);
  return `sha256:${hash}` === record.rid;
}
