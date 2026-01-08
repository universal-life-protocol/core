#!/usr/bin/env node
import fs from "fs";

function die(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

const argv = process.argv.slice(2);
let inFile = null;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!inFile) inFile = a;
  else die(`Unknown arg: ${a}`);
}

if (!inFile) {
  die("Usage: bin/summary.mjs /path/to/entries.core.jsonl");
}

const input = fs.readFileSync(inFile, "utf8");
const lines = input.split(/\r?\n/).filter((l) => l.trim().length);

const kindCounts = new Map();
const quadCounts = new Map();
const unitCounts = new Map();

for (const line of lines) {
  const row = JSON.parse(line);
  const k = row.k || "";
  const q = row.q || "";
  const u = row.u || "";
  kindCounts.set(k, (kindCounts.get(k) || 0) + 1);
  quadCounts.set(q, (quadCounts.get(q) || 0) + 1);
  unitCounts.set(u, (unitCounts.get(u) || 0) + 1);
}

function renderCounts(title, map) {
  const keys = Array.from(map.keys()).sort();
  const out = [];
  for (const k of keys) {
    out.push({ key: k, count: map.get(k) });
  }
  return { title, counts: out };
}

const summary = {
  total: lines.length,
  kind: renderCounts("kind", kindCounts).counts,
  quadrant: renderCounts("quadrant", quadCounts).counts,
  unit: renderCounts("unit", unitCounts).counts
};

process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
