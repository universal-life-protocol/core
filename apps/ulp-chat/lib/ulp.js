import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const WORLD_DIR = path.resolve("world");
const POLY_AWK = path.resolve("bin/poly.awk");

function loadAllowedMonomials(file) {
  if (!fs.existsSync(file)) return new Set();
  const allow = new Set();
  const lines = fs.readFileSync(file, "utf8").split("\n");
  let inPoly = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed === "poly:") {
      inPoly = true;
      continue;
    }
    if (trimmed === "end poly") {
      inPoly = false;
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts[0] === "allow" && parts[1]) {
      allow.add(parts[1]);
      continue;
    }
    if (inPoly && /^[+-]/.test(parts[0]) && parts[1]) {
      allow.add(parts[1]);
    }
  }
  return allow;
}

function runPolyAwk(worldDir) {
  return execFileSync("awk", ["-v", `WORLD_DIR=${worldDir}`, "-f", POLY_AWK], {
    encoding: "utf8"
  });
}

function parseBindDecisions(output) {
  const decisions = new Map();
  output
    .split("\n")
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts[0] !== "BIND") return;
      const intr = parts[2];
      const okIndex = parts.indexOf("ok");
      const reasonIndex = parts.indexOf("reason");
      const ok = okIndex !== -1 ? parts[okIndex + 1] === "1" : false;
      const reason =
        reasonIndex !== -1 ? parts.slice(reasonIndex + 1).join(" ") : "unknown";
      decisions.set(intr, { ok, reason });
    });
  return decisions;
}

function sortedSet(set) {
  return Array.from(set).sort();
}

function buildGateProcedure(name, allowSet) {
  const allowed = sortedSet(allowSet);
  const lines = [];
  lines.push(`procedure ${name} v2`);
  lines.push("domain:");
  for (const mono of allowed) {
    lines.push(`  +1 ${mono}`);
  }
  lines.push("end domain");
  lines.push("");
  lines.push("mode closed");
  lines.push("sign same");
  lines.push("max_wdegree 3");
  lines.push("shadow first_atom");
  lines.push("");
  lines.push("end procedure");
  return lines.join("\n");
}

function buildGateInterrupt(name, usedMonos) {
  const used = Array.from(new Set(usedMonos)).sort();
  const lines = [];
  lines.push(`interrupt ${name} v2`);
  lines.push("poly:");
  for (const mono of used) {
    lines.push(`  +1 ${mono}`);
  }
  lines.push("end poly");
  lines.push("end interrupt");
  return lines.join("\n");
}

function enforceGate(allowSet, usedMonos, gateName) {
  if (allowSet.size === 0) return;
  if (usedMonos.length === 0) return;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ulp-chat-gate-"));
  try {
    fs.writeFileSync(path.join(tempDir, ".atom"), fs.readFileSync(path.join(WORLD_DIR, ".atom")));
    fs.writeFileSync(
      path.join(tempDir, ".manifest"),
      fs.readFileSync(path.join(WORLD_DIR, ".manifest"))
    );
    fs.writeFileSync(path.join(tempDir, ".procedure"), buildGateProcedure(gateName, allowSet));
    fs.writeFileSync(path.join(tempDir, ".interrupt"), buildGateInterrupt("CHECK", usedMonos));

    const output = runPolyAwk(tempDir);
    const decisions = parseBindDecisions(output);
    const decision = decisions.get("CHECK");
    if (!decision || !decision.ok) {
      const reason = decision ? decision.reason : "input_output_rejected";
      throw new Error(`gate_reject:${gateName}:${reason}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function enforceInputAllowed() {
  const allow = loadAllowedMonomials(path.join(WORLD_DIR, ".input"));
  enforceGate(allow, ["scope"], "input_gate");
}

export function enforceOutputAllowed(output) {
  const allow = loadAllowedMonomials(path.join(WORLD_DIR, ".output"));
  const used = [];
  if (output && output.assistant_text !== undefined) used.push("assistant_text");
  if (output && output.memory_claims !== undefined) used.push("memory_claims");
  if (output && output.redactions !== undefined) used.push("redactions");
  enforceGate(allow, used, "output_gate");
}

function claimToMonomial(type, atoms) {
  if (typeof type !== "string" || type.length === 0) return "";
  const parts = type.split(".");
  const known = parts.filter((p) => atoms.has(p));
  if (known.length > 0) return known.join(".");
  return parts[0];
}

function loadAtoms() {
  const file = path.join(WORLD_DIR, ".atom");
  const atoms = new Set();
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0] === "atom" && parts[1]) atoms.add(parts[1]);
  }
  return atoms;
}

export function admitMemoryClaims(claims) {
  const admitted = [];
  const rejected = [];
  const decisionsOut = [];
  const atoms = loadAtoms();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ulp-chat-"));
  try {
    fs.writeFileSync(path.join(tempDir, ".atom"), fs.readFileSync(path.join(WORLD_DIR, ".atom")));
    fs.writeFileSync(path.join(tempDir, ".manifest"), fs.readFileSync(path.join(WORLD_DIR, ".manifest")));
    fs.writeFileSync(path.join(tempDir, ".procedure"), fs.readFileSync(path.join(WORLD_DIR, ".procedure")));

    const interruptLines = [];
    const claimMap = [];

    (claims || []).forEach((claim, idx) => {
      if (!claim || typeof claim.type !== "string") {
        rejected.push({ claim, reason: "invalid_type" });
        decisionsOut.push({
          index: idx + 1,
          intr: `CLAIM_${idx + 1}`,
          mono: "",
          ok: false,
          reason: "invalid_type",
          claim
        });
        return;
      }
      if (claim.type.startsWith("summary")) {
        rejected.push({ claim, reason: "summary_not_authoritative" });
        decisionsOut.push({
          index: idx + 1,
          intr: `CLAIM_${idx + 1}`,
          mono: "",
          ok: false,
          reason: "summary_not_authoritative",
          claim
        });
        return;
      }
      if (!claim.cite || claim.cite.length === 0) {
        rejected.push({ claim, reason: "missing_cite" });
        decisionsOut.push({
          index: idx + 1,
          intr: `CLAIM_${idx + 1}`,
          mono: "",
          ok: false,
          reason: "missing_cite",
          claim
        });
        return;
      }

      const mono = claimToMonomial(claim.type, atoms);
      if (!mono) {
        rejected.push({ claim, reason: "no_monomial" });
        decisionsOut.push({
          index: idx + 1,
          intr: `CLAIM_${idx + 1}`,
          mono: "",
          ok: false,
          reason: "no_monomial",
          claim
        });
        return;
      }

      const intrName = `CLAIM_${idx + 1}`;
      claimMap.push({ intrName, claim, mono, index: idx + 1 });

      interruptLines.push(`interrupt ${intrName} v2`);
      interruptLines.push("poly:");
      interruptLines.push(`  +1 ${mono}`);
      if (claim.cite && claim.cite.length > 0) {
        interruptLines.push("  +1 cite");
      }
      if (typeof claim.confidence === "number") {
        interruptLines.push("  +1 confidence");
      }
      interruptLines.push("end poly");
      interruptLines.push("end interrupt");
      interruptLines.push("");
    });

    fs.writeFileSync(path.join(tempDir, ".interrupt"), interruptLines.join("\n"));

    const output = runPolyAwk(tempDir);
    const decisions = parseBindDecisions(output);

    for (const entry of claimMap) {
      const decision = decisions.get(entry.intrName);
      const ok = !!(decision && decision.ok);
      const reason = decision ? decision.reason : "algebra_reject";
      decisionsOut.push({
        index: entry.index,
        intr: entry.intrName,
        mono: entry.mono,
        ok,
        reason,
        claim: entry.claim
      });
      if (ok) {
        admitted.push(entry.claim);
      } else {
        rejected.push({
          claim: entry.claim,
          reason
        });
      }
    }
  } catch (err) {
    (claims || []).forEach((claim, idx) => {
      rejected.push({ claim, reason: "algebra_error" });
      decisionsOut.push({
        index: idx + 1,
        intr: `CLAIM_${idx + 1}`,
        mono: "",
        ok: false,
        reason: "algebra_error",
        claim
      });
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return { admitted, rejected, decisions: decisionsOut };
}
