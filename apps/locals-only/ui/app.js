// app.js
// Additional UI utilities and enhancements
// Currently handled in main.js, but this file is available for future extensions

export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

export function parseRecord(recordBytes) {
  const lines = recordBytes.split("\n");
  const parsed = {};

  lines.forEach(line => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      parsed[key] = value;
    }
  });

  return parsed;
}

export function filterRecordsByKeyword(records, keyword) {
  const lower = keyword.toLowerCase();
  return records.filter(r =>
    r.bytes.toLowerCase().includes(lower)
  );
}
