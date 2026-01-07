import fs from "fs";
import path from "path";

const LEDGER_FILE = path.resolve("ledger/2026-01.jsonl");

export function append(event) {
  fs.mkdirSync(path.dirname(LEDGER_FILE), { recursive: true });
  const line = JSON.stringify({
    t: new Date().toISOString(),
    ...event
  });
  fs.appendFileSync(LEDGER_FILE, line + "\n");
}

export function readAll() {
  if (!fs.existsSync(LEDGER_FILE)) return [];
  const raw = fs.readFileSync(LEDGER_FILE, "utf8").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
