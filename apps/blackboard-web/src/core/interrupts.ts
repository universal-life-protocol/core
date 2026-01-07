export type InterruptMap = Record<string, string>;

export async function loadInterrupts(path = "/world/.interrupt"): Promise<InterruptMap> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return {};
    const text = await res.text();
    return parseInterrupts(text);
  } catch {
    return {};
  }
}

export function parseInterrupts(text: string): InterruptMap {
  const out: InterruptMap = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}
