import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const LOG_PATH = process.env.ULP_RELAY_LOG || path.join(process.cwd(), "trace.log");
const MAX_BODY_BYTES = Number(process.env.ULP_RELAY_MAX_BODY || 1_000_000);

const traces = [];
const traceById = new Set();
const clients = new Set();

function loadLog() {
  if (!fs.existsSync(LOG_PATH)) return;
  const data = fs.readFileSync(LOG_PATH, "utf8");
  for (const line of data.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const t = JSON.parse(trimmed);
      if (t && typeof t.id === "string" && !traceById.has(t.id)) {
        traces.push(t);
        traceById.add(t.id);
      }
    } catch {
      continue;
    }
  }
}

function validateTraceEnvelope(t) {
  if (!t || typeof t !== "object") return "Trace must be an object";
  if (t.v !== 2) return "Unsupported protocol version";
  if (typeof t.id !== "string" || !t.id.startsWith("ulp:v2:")) return "Bad id";
  if (typeof t.ts !== "number") return "Bad ts";
  if (typeof t.kind !== "string") return "Bad kind";
  if (typeof t.template !== "string") return "Bad template";
  if (!(typeof t.author === "string" || t.author === null)) return "Bad author";
  if (!t.payload || typeof t.payload !== "object") return "Bad payload";
  if (!Array.isArray(t.refs)) return "Bad refs";
  if (!(typeof t.sig === "string" || t.sig === null)) return "Bad sig";
  return null;
}

function matchesFilter(t, filter) {
  if (filter.since != null && t.ts < filter.since) return false;
  if (filter.templates?.length && !filter.templates.includes(t.template)) return false;
  if (filter.kinds?.length && !filter.kinds.includes(t.kind)) return false;
  if (filter.authors?.length && !filter.authors.includes(t.author)) return false;
  return true;
}

function parseFilter(reqUrl) {
  const templates = reqUrl.searchParams.getAll("template");
  const kinds = reqUrl.searchParams.getAll("kind");
  const authors = reqUrl.searchParams.getAll("author");
  const sinceParam = reqUrl.searchParams.get("since");
  const since = sinceParam ? Number(sinceParam) : undefined;

  return {
    templates: templates.length ? templates : undefined,
    kinds: kinds.length ? kinds : undefined,
    authors: authors.length ? authors : undefined,
    since: Number.isFinite(since) ? since : undefined
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function broadcast(trace) {
  const line = `${JSON.stringify(trace)}\n`;
  for (const client of clients) {
    if (!matchesFilter(trace, client.filter)) continue;
    client.res.write(line);
  }
}

loadLog();

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && reqUrl.pathname === "/traces") {
    try {
      const data = await readJson(req);
      const input = Array.isArray(data.traces) ? data.traces : [];
      const accepted = [];
      const rejected = [];

      for (const trace of input) {
        const reason = validateTraceEnvelope(trace);
        if (reason) {
          rejected.push({ id: trace?.id, reason });
          continue;
        }
        if (traceById.has(trace.id)) {
          accepted.push(trace.id);
          continue;
        }
        traceById.add(trace.id);
        traces.push(trace);
        fs.appendFileSync(LOG_PATH, `${JSON.stringify(trace)}\n`);
        accepted.push(trace.id);
        broadcast(trace);
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted, rejected }));
      return;
    } catch (e) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
      return;
    }
  }

  if (req.method === "GET" && reqUrl.pathname === "/traces/stream") {
    const filter = parseFilter(reqUrl);
    res.writeHead(200, {
      "content-type": "application/x-ndjson",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });

    for (const trace of traces) {
      if (!matchesFilter(trace, filter)) continue;
      res.write(`${JSON.stringify(trace)}\n`);
    }

    const client = { res, filter };
    clients.add(client);

    req.on("close", () => {
      clients.delete(client);
    });
    return;
  }

  if (req.method === "GET" && reqUrl.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, traces: traces.length, peers: clients.size }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`ULP relay listening on :${PORT}`);
  console.log(`Log file: ${LOG_PATH}`);
});
