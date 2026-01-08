#!/usr/bin/env node
import crypto from "crypto";
import fs from "fs";
import path from "path";

function die(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function normContent(s) {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
}

function unescapeTraceText(s) {
  return s
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function canonSemanticCore(e, strict = false) {
  const obj = {};
  obj.entry_id = String(e.entry_id ?? "");
  obj.kind = String(e.kind ?? "");
  obj.quadrant = String(e.quadrant ?? "");
  obj.unit = String(e.unit ?? "");
  obj.content = normContent(e.content ?? "");

  let tags = Array.isArray(e.tags) ? e.tags.map(String) : [];
  let refs = Array.isArray(e.refs) ? e.refs.map(String) : [];

  tags = sortUtf8Bytes(Array.from(new Set(tags)));
  refs = sortUtf8Bytes(Array.from(new Set(refs)));

  if (strict) {
    obj.tags = tags;
    obj.refs = refs;
  } else {
    if (tags.length) obj.tags = tags;
    if (refs.length) obj.refs = refs;
  }

  return JSON.stringify(obj);
}

function sortUtf8Bytes(arr) {
  const bufs = arr.map((x) => Buffer.from(String(x), "utf8"));
  bufs.sort((a, b) => Buffer.compare(a, b));
  return bufs.map((b) => b.toString("utf8"));
}

function mapKind(type, overrides) {
  if (overrides && overrides.has(type)) {
    return overrides.get(type);
  }
  switch (type) {
    case "STDIN":
      return "REQUEST";
    case "STDOUT":
    case "STDERR":
      return "FACT";
    case "CLAUSE":
      return "COMMITMENT";
    case "EXEC":
    case "EXIT":
      return "FACT";
    default:
      if (type.startsWith("ALG_") || type.startsWith("DECOMP_")) return "FACT";
      if (type === "POLICY" || type === "GEOMETRY" || type === "REPLICA") return "FACT";
      return "FACT";
  }
}

function mapQuadrant(type) {
  switch (type) {
    case "STDIN":
      return "KU";
    case "STDOUT":
      return "KK";
    case "STDERR":
      return "KU";
    case "CLAUSE":
      return "KK";
    case "EXEC":
    case "EXIT":
      return "KK";
    default:
      return "UK";
  }
}

function mapUnit(type) {
  switch (type) {
    case "STDIN":
      return "other";
    case "STDOUT":
    case "STDERR":
      return "self";
    default:
      return "system";
  }
}

function parseTabLine(line) {
  return line.split("\t");
}

function parseAlgLine(line) {
  return line.trim().split(/\s+/);
}

function entryIdFor(idx, type, content) {
  const h = sha256Hex(Buffer.from(content, "utf8"));
  return `v3:${idx}:${type}:${h}`;
}

function loadKindMap(viewPath) {
  if (!viewPath) return new Map();
  const text = fs.readFileSync(viewPath, "utf8");
  const lines = text.split(/\r?\n/);
  const map = new Map();
  let inMap = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (line === "map kind") {
      inMap = true;
      continue;
    }
    if (line === "end map") {
      inMap = false;
      continue;
    }
    if (!inMap) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      map.set(parts[0], parts[1]);
    }
  }

  return map;
}

function extractContent(type, parts) {
  if (type === "STDIN" || type === "STDOUT" || type === "STDERR") {
    const textIndex = parts.indexOf("text");
    if (textIndex !== -1 && parts[textIndex + 1] != null) {
      return unescapeTraceText(parts[textIndex + 1]);
    }
  }

  if (type === "CLAUSE") {
    const qidIndex = parts.indexOf("qid");
    const intrIndex = parts.indexOf("intr");
    const qid = qidIndex !== -1 ? parts[qidIndex + 1] : "";
    const intr = intrIndex !== -1 ? parts[intrIndex + 1] : "";
    return `qid ${qid} intr ${intr}`.trim();
  }

  if (type === "EXEC") {
    const eidIndex = parts.indexOf("eid");
    const qidIndex = parts.indexOf("qid");
    const intrIndex = parts.indexOf("intr");
    const eid = eidIndex !== -1 ? parts[eidIndex + 1] : "";
    const qid = qidIndex !== -1 ? parts[qidIndex + 1] : "";
    const intr = intrIndex !== -1 ? parts[intrIndex + 1] : "";
    return `eid ${eid} qid ${qid} intr ${intr}`.trim();
  }

  if (type === "EXIT") {
    const intrIndex = parts.indexOf("intr");
    const codeIndex = parts.indexOf("code");
    const intr = intrIndex !== -1 ? parts[intrIndex + 1] : "";
    const code = codeIndex !== -1 ? parts[codeIndex + 1] : "";
    return `intr ${intr} code ${code}`.trim();
  }

  return parts.slice(1).join(" ").trim();
}

const argv = process.argv.slice(2);
let tracePath = null;
let outDir = null;
let strict = false;
let inputViewPath = null;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--trace") tracePath = argv[++i];
  else if (a === "--out") outDir = argv[++i];
  else if (a === "--strict") strict = true;
  else if (a === "--view") inputViewPath = argv[++i];
  else die(`Unknown arg: ${a}`);
}

if (!tracePath || !outDir) {
  die("Usage: bin/adapter.mjs --trace path/to/trace.log --out /path/to/out [--view path/to/.view] [--strict]");
}

const trace = fs.readFileSync(tracePath, "utf8").split(/\r?\n/).filter((l) => l.length);
fs.mkdirSync(outDir, { recursive: true });

const entriesPath = path.join(outDir, "entries.jsonl");
const corePath = path.join(outDir, "entries.core.jsonl");
const outputViewPath = path.join(outDir, "view.stub");
const symmetryPath = path.join(outDir, "symmetry.stub");

const entriesOut = fs.openSync(entriesPath, "w");
const coreOut = fs.openSync(corePath, "w");

const kindOverrides = loadKindMap(inputViewPath);

let idx = 0;
for (const line of trace) {
  idx += 1;
  let type = "";
  let parts = [];

  if (line.startsWith("#ALG")) {
    parts = parseAlgLine(line);
    type = parts[1] || "ALG";
  } else {
    parts = parseTabLine(line);
    type = parts[0] || "UNKNOWN";
  }

  const content = extractContent(type, parts);
  const entry = {
    entry_id: entryIdFor(idx, type, normContent(content)),
    kind: mapKind(type, kindOverrides),
    quadrant: mapQuadrant(type),
    unit: mapUnit(type),
    content: content,
    tags: [],
    refs: []
  };

  fs.writeSync(entriesOut, JSON.stringify(entry) + "\n");

  const canon = canonSemanticCore(entry, strict);
  const h = sha256Hex(Buffer.from(canon, "utf8"));
  const core = { h, q: entry.quadrant, u: entry.unit, k: entry.kind, canon };
  fs.writeSync(coreOut, JSON.stringify(core) + "\n");
}

fs.closeSync(entriesOut);
fs.closeSync(coreOut);

const viewStub =
  "view v1\n" +
  "canvas infinite\n" +
  "layout quadrant\n" +
  "node default\n" +
  "  shape card\n" +
  "end node\n" +
  "map kind\n" +
  "  STDIN REQUEST\n" +
  "  STDOUT FACT\n" +
  "  STDERR FACT\n" +
  "  CLAUSE COMMITMENT\n" +
  "end map\n" +
  "end view\n";
fs.writeFileSync(outputViewPath, viewStub, "utf8");

const symmetryStub =
  "symmetry v3\n" +
  "delta hash sha256\n" +
  "canon json v1\n" +
  "delta profile CONV_MIN\n" +
  "delta weights set=0.40 order=0.10 quad=0.40 unit=0.10 kind=0\n" +
  "delta components set order quad unit\n" +
  "delta threshold 0\n" +
  "transform reorder allowed\n" +
  "invariant entry_hash_set\n" +
  "forbid invent_entries\n" +
  "forbid drop_entries\n" +
  "forbid rewrite_entries\n" +
  "forbid change_units\n" +
  "end symmetry\n";
fs.writeFileSync(symmetryPath, symmetryStub, "utf8");
