import crypto from "crypto";
import { readAll } from "./ledger.js";

export function buildContext() {
  const events = readAll();
  const claimsById = new Map();
  const admitted = new Set();
  const redacted = new Set();
  const bindsByClaimId = new Map();

  for (const e of events) {
    if (e.kind === "claim" && e.id) claimsById.set(e.id, e);
    if (e.kind === "admit" && e.claim) admitted.add(e.claim);
    if (e.kind === "redact.request" && e.target) redacted.add(e.target);
    if (e.kind === "alp.bind" && e.claim_id) bindsByClaimId.set(e.claim_id, e);
  }

  const facts = [];
  const tasks = [];

  for (const id of admitted) {
    if (redacted.has(id)) continue;
    const claim = claimsById.get(id);
    if (!claim || typeof claim.mono !== "string") continue;
    if (claim.mono.startsWith("fact")) facts.push(claim.value);
    if (claim.mono.startsWith("task")) tasks.push(claim.value);
  }

  return {
    events,
    claimsById,
    admitted,
    redacted,
    bindsByClaimId,
    facts,
    tasks
  };
}

export function buildContextObject() {
  const context = buildContext();
  const facts = context.facts.filter((f) => typeof f === "string").slice().sort();
  const tasks = context.tasks.filter((t) => typeof t === "string").slice().sort();

  return {
    version: 1,
    facts,
    tasks
  };
}

export function serializeContext(ctx) {
  const ordered = {
    version: ctx.version,
    facts: Array.isArray(ctx.facts) ? ctx.facts : [],
    tasks: Array.isArray(ctx.tasks) ? ctx.tasks : []
  };
  return JSON.stringify(ordered, null, 2);
}

export function hashContext(serialized) {
  return crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
}
