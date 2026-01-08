#!/usr/bin/env node
import fs from "fs";

function die(msg) {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

function readJsonl(pathOrNull) {
  const s = pathOrNull ? fs.readFileSync(pathOrNull, "utf8") : fs.readFileSync(0, "utf8");
  const lines = s.split(/\r?\n/).filter((l) => l.trim().length);
  const rows = [];
  for (const line of lines) rows.push(JSON.parse(line));
  return rows;
}

function levenshtein(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = new Array(m + 1);
  for (let j = 0; j <= m; j++) dp[j] = j;

  for (let i = 1; i <= n; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost
      );
      prev = tmp;
    }
  }
  return dp[m];
}

function jaccardDistance(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const uni = setA.size + setB.size - inter;
  return 1 - inter / uni;
}

function mismatchRate(intersection, mapA, mapB) {
  if (intersection.length === 0) return 1;
  let bad = 0;
  for (const h of intersection) {
    if ((mapA.get(h) ?? "") !== (mapB.get(h) ?? "")) bad++;
  }
  return bad / intersection.length;
}

function parseWeights(s) {
  const w = { set: 0, order: 0, quad: 0, unit: 0, kind: 0 };
  if (!s) return w;
  for (const part of s.split(",")) {
    const [k, v] = part.split("=").map((x) => x.trim());
    if (!(k in w)) die(`Unknown component weight: ${k}`);
    w[k] = Number(v);
    if (!Number.isFinite(w[k]) || w[k] < 0) die(`Bad weight for ${k}`);
  }
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 1e-9) die(`Weights must sum to 1.0 (got ${sum})`);
  return w;
}

const argv = process.argv.slice(2);
let aPath = null;
let bPath = null;
let weights = "set=0.4,order=0.1,quad=0.4,unit=0.1,kind=0";
let explain = false;

for (let i = 0; i < argv.length; i++) {
  const x = argv[i];
  if (x === "--a") aPath = argv[++i];
  else if (x === "--b") bPath = argv[++i];
  else if (x === "--w") weights = argv[++i];
  else if (x === "--explain") explain = true;
  else die(`Unknown arg: ${x}`);
}

if (!aPath || !bPath) {
  die("Usage: bin/delta.mjs --a A.core.jsonl --b B.core.jsonl [--w weights] [--explain]");
}

const A = readJsonl(aPath);
const B = readJsonl(bPath);

const seqA = A.map((r) => r.h);
const seqB = B.map((r) => r.h);
const setA = new Set(seqA);
const setB = new Set(seqB);

const mapQA = new Map(A.map((r) => [r.h, r.q]));
const mapQB = new Map(B.map((r) => [r.h, r.q]));
const mapUA = new Map(A.map((r) => [r.h, r.u]));
const mapUB = new Map(B.map((r) => [r.h, r.u]));
const mapKA = new Map(A.map((r) => [r.h, r.k]));
const mapKB = new Map(B.map((r) => [r.h, r.k]));

const inter = [];
for (const h of setA) if (setB.has(h)) inter.push(h);

const d_set = jaccardDistance(setA, setB);
const d_order = levenshtein(seqA, seqB) / Math.max(seqA.length, seqB.length, 1);
const d_quad = mismatchRate(inter, mapQA, mapQB);
const d_unit = mismatchRate(inter, mapUA, mapUB);
const d_kind = mismatchRate(inter, mapKA, mapKB);

const w = parseWeights(weights);
const delta =
  w.set * d_set +
  w.order * d_order +
  w.quad * d_quad +
  w.unit * d_unit +
  w.kind * d_kind;

if (!explain) {
  process.stdout.write(JSON.stringify({ delta, d_set, d_order, d_quad, d_unit, d_kind, weights: w }) + "\n");
} else {
  process.stdout.write(
    JSON.stringify(
      {
        delta,
        weights: w,
        components: { d_set, d_order, d_quad, d_unit, d_kind },
        sizes: {
          nA: seqA.length,
          nB: seqB.length,
          inter: inter.length,
          union: new Set([...setA, ...setB]).size
        }
      },
      null,
      2
    ) + "\n"
  );
}
