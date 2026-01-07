import express from "express";
import crypto from "crypto";
import fs from "fs";
import { append, readAll } from "./lib/ledger.js";
import {
  buildContext,
  buildContextObject,
  serializeContext,
  hashContext
} from "./lib/context.js";
import { callLLM } from "./lib/llm.js";
import { admitMemoryClaims, enforceInputAllowed, enforceOutputAllowed } from "./lib/ulp.js";
import { writeViews } from "./lib/views.js";

const app = express();
app.use(express.json());

let claimSeq = 0;
function nextClaimId() {
  claimSeq += 1;
  const seed = `${Date.now()}-${claimSeq}-${Math.random()}`;
  return `clm:${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

let msgSeq = 0;
function nextMsgId() {
  msgSeq += 1;
  const seed = `${Date.now()}-${msgSeq}-${Math.random()}`;
  return `msg:${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

const PRIVATE_KEY_PEM = fs.existsSync("keys/private.pem")
  ? fs.readFileSync("keys/private.pem", "utf8")
  : null;

function signHash(hashHex) {
  if (!PRIVATE_KEY_PEM) return null;
  const sig = crypto.sign(null, Buffer.from(hashHex, "utf8"), PRIVATE_KEY_PEM);
  return sig.toString("base64");
}

app.post("/chat", async (req, res) => {
  try {
    const userText = req.body && req.body.text;
    if (!userText) return res.status(400).json({ error: "No text" });

    enforceInputAllowed();

    const msgId = nextMsgId();
    append({ kind: "msg.user", id: msgId, text: userText });

    const ctxObj = buildContextObject();
    const ctxSerialized = serializeContext(ctxObj);
    const ctxHash = hashContext(ctxSerialized);
    const ctxSig = signHash(ctxHash);

    append({
      kind: "view.context",
      hash: ctxHash,
      sig_b64: ctxSig,
      sig_alg: ctxSig ? "ed25519" : null,
      signer: ctxSig ? "local-key-1" : null,
      format: "json",
      content_b64: Buffer.from(ctxSerialized, "utf8").toString("base64"),
      derived_from: {
        facts: ctxObj.facts.length,
        tasks: ctxObj.tasks.length
      }
    });

    const llm = await callLLM({
      userText,
      contextSerialized: ctxSerialized,
      contextHash: ctxHash
    });
    enforceOutputAllowed(llm);

    const asstId = nextMsgId();
    append({
      kind: "msg.assistant",
      id: asstId,
      text: llm.assistant_text,
      context_hash: ctxHash
    });
    append({
      kind: "llm.call",
      context_hash: ctxHash,
      model: "example-model",
      output_ref: asstId
    });

    const claims = (llm.memory_claims || []).map((c) => ({
      ...c,
      cite: c && c.cite && c.cite.length ? c.cite : [msgId]
    }));
    const { admitted, rejected, decisions } = admitMemoryClaims(claims);

    const admittedClaims = [];
    const claimIdsByIndex = new Map();
    for (const decision of decisions) {
      const id = nextClaimId();
      claimIdsByIndex.set(decision.index, id);
      append({
        kind: "alp.bind",
        context_hash: ctxHash,
        intr: decision.intr,
        ok: decision.ok,
        reason: decision.reason,
        mono: decision.mono,
        claim_index: decision.index,
        claim_id: id
      });
    }
    for (const claim of admitted) {
      const index = decisions.find((d) => d.claim === claim)?.index;
      const id = index ? claimIdsByIndex.get(index) : nextClaimId();
      append({
        kind: "claim",
        id,
      mono: claim.type,
      value: claim.value,
      cite: claim.cite,
      confidence: claim.confidence,
      context_hash: ctxHash
    });
    append({
      kind: "admit",
      claim: id,
      mono: claim.type,
      value: claim.value,
      context_hash: ctxHash
    });
    admittedClaims.push({ id, mono: claim.type, value: claim.value });
  }

    for (const rej of rejected) {
    const index = decisions.find((d) => d.claim === rej.claim)?.index;
    const id = index ? claimIdsByIndex.get(index) : nextClaimId();
    append({
      kind: "claim",
      id,
      mono: rej.claim && rej.claim.type,
      value: rej.claim && rej.claim.value,
      cite: rej.claim && rej.claim.cite,
      confidence: rej.claim && rej.claim.confidence,
      context_hash: ctxHash
    });
    append({
      kind: "reject",
      claim: id,
      reason: rej.reason,
      context_hash: ctxHash
    });
  }

  for (const r of llm.redactions || []) {
    append({ kind: "redact.request", target: r });
  }

    const nextContext = buildContext();
    const viewSnapshots = writeViews(nextContext);
    for (const snap of viewSnapshots) {
      append({
        kind: "view.snapshot",
        path: snap.path,
        hash: snap.hash
      });
    }

    res.json({
      reply: llm.assistant_text,
      admitted_memory: admittedClaims,
      context_hash: ctxHash,
      claim_decisions: decisions.map((d) => ({
        index: d.index,
        mono: d.mono,
        ok: d.ok,
        reason: d.reason,
        claim_id: claimIdsByIndex.get(d.index) || null
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "server_error" });
  }
});

app.get("/explain/claim/:claimId", (req, res) => {
  const claimId = req.params.claimId;
  const context = buildContext();
  const claim = context.events.find((e) => e.kind === "claim" && e.id === claimId);
  const admit = context.events.find((e) => e.kind === "admit" && e.claim === claimId);
  const reject = context.events.find((e) => e.kind === "reject" && e.claim === claimId);
  const bind = context.bindsByClaimId.get(claimId) || null;

  if (!claim) return res.status(404).json({ error: "Claim not found" });

  res.json({
    claim,
    bind: bind || null,
    decision: admit ? "admitted" : "rejected",
    reason: reject ? reject.reason : "ok",
    cites: claim.cite || []
  });
});

app.get("/explain/:hash", (req, res) => {
  const hash = req.params.hash;
  const events = readAll();
  const ctxEvt = events.find((e) => e.kind === "view.context" && e.hash === hash);

  if (!ctxEvt) return res.status(404).json({ error: "Context hash not found" });

  const ctxSerialized = Buffer.from(ctxEvt.content_b64, "base64").toString("utf8");
  const recomputed = hashContext(ctxSerialized);

  const related = events.filter(
    (e) =>
      e.context_hash === hash ||
      (e.kind === "view.context" && e.hash === hash) ||
      (e.kind === "llm.call" && e.context_hash === hash)
  );

  const assistantMsgs = related.filter((e) => e.kind === "msg.assistant");
  const calls = related.filter((e) => e.kind === "llm.call");
  const binds = related.filter((e) => e.kind === "alp.bind");
  const claims = related.filter((e) => e.kind === "claim");
  const admits = related.filter((e) => e.kind === "admit");
  const rejects = related.filter((e) => e.kind === "reject");

  res.json({
    hash,
    context: {
      stored_hash: ctxEvt.hash,
      recomputed_hash: recomputed,
      matches: recomputed === hash,
      derived_from: ctxEvt.derived_from,
      serialized: ctxSerialized,
      sig_b64: ctxEvt.sig_b64 || null,
      signer: ctxEvt.signer || null
    },
    decisions: {
      calls,
      binds: binds.map((b) => ({
        claim_id: b.claim_id || null,
        claim_index: b.claim_index,
        intr: b.intr,
        mono: b.mono,
        ok: b.ok,
        reason: b.reason
      }))
    },
    outputs: {
      assistant_messages: assistantMsgs
    },
    memory: {
      claims,
      admits,
      rejects
    }
  });
});

app.get("/views/facts", (req, res) => {
  const context = buildContext();
  const facts = [];
  for (const id of context.admitted) {
    if (context.redacted.has(id)) continue;
    const c = context.claimsById.get(id);
    if (c && typeof c.mono === "string" && c.mono.startsWith("fact")) {
      facts.push(c);
    }
  }
  facts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  res.json({ total: facts.length, items: facts.slice(offset, offset + limit) });
});

app.get("/views/tasks", (req, res) => {
  const context = buildContext();
  const tasks = [];
  for (const id of context.admitted) {
    if (context.redacted.has(id)) continue;
    const c = context.claimsById.get(id);
    if (c && typeof c.mono === "string" && c.mono.startsWith("task")) {
      tasks.push(c);
    }
  }
  tasks.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  res.json({ total: tasks.length, items: tasks.slice(offset, offset + limit) });
});

app.get("/views/timeline", (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : null;
  const events = buildContext().events;
  if (offset === null) {
    return res.json({ total: events.length, events: events.slice(-limit) });
  }
  res.json({ total: events.length, events: events.slice(offset, offset + limit) });
});

app.get("/views/summary", (req, res) => {
  const context = buildContext();
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;

  const facts = context.facts.slice();
  const tasks = context.tasks.slice();
  const factsSlice = facts.slice(offset, offset + limit);
  const tasksSlice = tasks.slice(offset, offset + limit);
  const factsTruncated = facts.length > offset + limit;
  const tasksTruncated = tasks.length > offset + limit;
  res.type("text/plain").send(
    [
      "# Summary",
      "",
      "## Facts",
      ...factsSlice.map((f) => `- ${f}`),
      ...(factsTruncated ? ["- ..."] : []),
      "",
      "## Tasks",
      ...tasksSlice.map((t) => `- ${t}`),
      ...(tasksTruncated ? ["- ..."] : [])
    ].join("\n")
  );
});

app.get("/views/binds", (req, res) => {
  const context = buildContext();
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  const items = [];
  for (const [claimId, bind] of context.bindsByClaimId.entries()) {
    items.push({ claim_id: claimId, bind });
  }
  items.sort((a, b) => (a.claim_id < b.claim_id ? -1 : a.claim_id > b.claim_id ? 1 : 0));
  res.json({ total: items.length, items: items.slice(offset, offset + limit) });
});

app.get("/views/binds/:claimId", (req, res) => {
  const claimId = req.params.claimId;
  const context = buildContext();
  const bind = context.bindsByClaimId.get(claimId);
  if (!bind) return res.status(404).json({ error: "Bind not found" });
  res.json({ claim_id: claimId, bind });
});

app.get("/views/redacted", (req, res) => {
  const context = buildContext();
  const redacted = [];
  for (const id of context.redacted) {
    const claim = context.claimsById.get(id);
    if (claim) redacted.push(claim);
  }
  redacted.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  res.json({ total: redacted.length, items: redacted.slice(offset, offset + limit) });
});

app.post("/redact/:claimId", (req, res) => {
  const claimId = req.params.claimId;
  if (!claimId) return res.status(400).json({ error: "No claim id" });
  append({ kind: "redact.request", target: claimId, by: "user" });

  const nextContext = buildContext();
  const viewSnapshots = writeViews(nextContext);
  for (const snap of viewSnapshots) {
    append({
      kind: "view.snapshot",
      path: snap.path,
      hash: snap.hash
    });
  }

  res.json({ ok: true, redacted: claimId });
});

app.listen(3000, () => {
  console.log("ULP chat running on http://localhost:3000");
});
