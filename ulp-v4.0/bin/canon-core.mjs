#!/usr/bin/env node
import crypto from "crypto";
import fs from "fs";

function die(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function normContent(s) {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
}

function sortUtf8Bytes(arr) {
  const bufs = arr.map((x) => Buffer.from(String(x), "utf8"));
  bufs.sort((a, b) => Buffer.compare(a, b));
  return bufs.map((b) => b.toString("utf8"));
}

function dedupeSorted(arr) {
  const out = [];
  let prev = null;
  for (const x of arr) {
    if (prev === null || x !== prev) out.push(x);
    prev = x;
  }
  return out;
}

function canonSemanticCore(e, strict = false) {
  const entry_id = String(e.entry_id ?? "");
  const kind = String(e.kind ?? "");
  const quadrant = String(e.quadrant ?? "");
  const unit = String(e.unit ?? "");
  const content = normContent(e.content ?? "");

  let tags = Array.isArray(e.tags) ? e.tags.map(String) : [];
  let refs = Array.isArray(e.refs) ? e.refs.map(String) : [];

  tags = dedupeSorted(sortUtf8Bytes(tags));
  refs = dedupeSorted(sortUtf8Bytes(refs));

  const obj = {};
  obj.entry_id = entry_id;
  obj.kind = kind;
  obj.quadrant = quadrant;
  obj.unit = unit;
  obj.content = content;

  if (strict) {
    obj.tags = tags;
    obj.refs = refs;
  } else {
    if (tags.length) obj.tags = tags;
    if (refs.length) obj.refs = refs;
  }

  return JSON.stringify(obj);
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const argv = process.argv.slice(2);
let strict = false;
let inFile = null;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--strict") strict = true;
  else if (!inFile) inFile = a;
  else die(`Unknown arg: ${a}`);
}

const input = inFile ? fs.readFileSync(inFile, "utf8") : fs.readFileSync(0, "utf8");
const lines = input.split(/\r?\n/).filter((l) => l.trim().length);

for (const line of lines) {
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    try {
      const top = JSON.parse(input);
      if (Array.isArray(top.trace)) {
        for (const it of top.trace) {
          const canon = canonSemanticCore(it, strict);
          const h = sha256Hex(Buffer.from(canon, "utf8"));
          const out = { h, q: String(it.quadrant ?? ""), u: String(it.unit ?? ""), k: String(it.kind ?? ""), canon };
          process.stdout.write(JSON.stringify(out) + "\n");
        }
        process.exit(0);
      }
    } catch {
      die("Input must be JSONL entries or a JSON object with {trace:[...]}");
    }
  }

  const canon = canonSemanticCore(e, strict);
  const h = sha256Hex(Buffer.from(canon, "utf8"));
  const out = { h, q: String(e.quadrant ?? ""), u: String(e.unit ?? ""), k: String(e.kind ?? ""), canon };
  process.stdout.write(JSON.stringify(out) + "\n");
}
