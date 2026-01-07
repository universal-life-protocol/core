#!/usr/bin/env node
/**
 * ULP v2.0 libp2p WebRTC server (Node.js)
 * - Serves ULP traces over HTTP + libp2p WebRTC
 * - TURN/ICE servers configurable via CLI flags or env
 *
 * Env/flags:
 *   --traces or TRACE_DIR: path to directory containing trace.log files (default ../../out)
 *   --port or PORT: HTTP port (default 8080)
 *   --ice-urls or ICE_URLS: comma-separated ICE server URLs (stun:, turn:)
 *   --ice-username or ICE_USERNAME
 *   --ice-password or ICE_PASSWORD
 *   --listen or LISTEN: comma-separated listen multiaddrs (default /ip4/0.0.0.0/udp/0/webrtc)
 *   --log: enable verbose logging
 */
if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(message, params = {}) {
      super(message, params);
      this.detail = params.detail;
    }
  };
}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import QRCode from "qrcode";
import { createLibp2p } from "libp2p";
import { webRTC } from "@libp2p/webrtc";
import { webRTCDirect } from "@libp2p/webrtc-direct";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";

const ULP_PROTOCOL = "/ulp/2.0.0";

// ULP SDK templates
import { projectionHTML, projectionSchema, recordFromTrace } from "../ulp-sdk/src/index.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.replace(/^--/, "");
    const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
    opts[key] = val;
  }
  return {
    tracesDir: path.resolve(opts.traces || process.env.TRACE_DIR || path.join("..", "out")),
    port: Number(opts.port || process.env.PORT || 8080),
    iceUrls:
      (opts["ice-urls"] ||
        process.env.ICE_URLS ||
        "stun:stun.l.google.com:19302").split(","),
    iceUsername: opts["ice-username"] || process.env.ICE_USERNAME || "",
    icePassword: opts["ice-password"] || process.env.ICE_PASSWORD || "",
    listenAddrs:
      (opts.listen || process.env.LISTEN || "/ip4/0.0.0.0/udp/0/webrtc").split(","),
    verbose: Boolean(opts.log || process.env.LOG),
  };
}

function hashHex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function parsePolicy(traceBytes) {
  return recordFromTrace(traceBytes).policy;
}

function findTraceFiles(baseDir) {
  const found = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(baseDir, entry.name);
    if (entry.isFile() && entry.name === "trace.log") {
      found.push(full);
    } else if (entry.isDirectory()) {
      found.push(...findTraceFiles(full));
    }
  }
  return found;
}

function loadRecords(traceDir) {
  const files = findTraceFiles(traceDir);
  const records = new Map();
  for (const file of files) {
    const bytes = fs.readFileSync(file);
    try {
      const rec = recordFromTrace(bytes);
      records.set(rec.rid, { rid: rec.rid, bytes, policy: rec.policy, path: file });
    } catch (err) {
      console.warn(`Skipping invalid trace ${file}: ${err.message || err}`);
    }
  }
  return records;
}

function buildIceServers(urls, username, password) {
  return urls
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => ({
      urls: u,
      username: username || undefined,
      credential: password || undefined,
    }));
}

async function main() {
  const cfg = parseArgs();
  const records = loadRecords(cfg.tracesDir);

  console.log(
    `Loaded ${records.size} record(s) from ${cfg.tracesDir} (ice=${cfg.iceUrls.join(
    ","
    )})`
  );

  // Wrap transports to ensure filter exists (libp2p transport-manager requires it)
  const wrapTransport = (factory) => {
    return (components) => {
      const t = factory(components);
      const baseFilter =
        typeof t.filter === "function" ? t.filter.bind(t) : (addrs) => addrs;
      const wrapper = Object.create(t);
      wrapper.filter = (addrs) => baseFilter(addrs);
      return wrapper;
    };
  };

  const rtc = wrapTransport(
    webRTC({
      iceServers: buildIceServers(cfg.iceUrls, cfg.iceUsername, cfg.icePassword),
    })
  );
  const rtcDirect = wrapTransport(webRTCDirect());

  const node = await createLibp2p({
    addresses: { listen: cfg.listenAddrs.map((a) => a.trim()).filter(Boolean) },
    transports: [rtc, rtcDirect],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
  });

  node.handle(ULP_PROTOCOL, async ({ stream }) => {
    const chunks = [];
    for await (const chunk of stream.source) {
      chunks.push(chunk.slice ? chunk.slice() : chunk);
    }
    const request = Buffer.concat(chunks).toString("utf8").trim();
    const rid = request.replace(/^ulp:\/\//, "").trim();
    const rec = records.get(rid);
    if (!rec) {
      await stream.sink(
        (async function* () {
          yield Buffer.from("NOT_FOUND\n");
        })()
      );
      return;
    }
    await stream.sink(
        (async function* () {
          yield rec.bytes;
        })()
    );
  });

  const app = express();

  app.get("/api/records", (_req, res) => {
    const list = Array.from(records.values()).map((r) => ({
      rid: r.rid,
      size: r.bytes.length,
      policy: r.policy,
    }));
    res.json(list);
  });

  app.get("/api/record/:rid", (req, res) => {
    const rec = records.get(req.params.rid);
    if (!rec) return res.status(404).send("Not found");
    res.type("application/octet-stream").send(rec.bytes);
  });

  app.get("/api/projection/:rid", (req, res) => {
    const rec = records.get(req.params.rid);
    if (!rec) return res.status(404).send("Not found");
    const selected = new Set(
      String(req.query.fields || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    res
      .type("text/html")
      .send(
        projectionHTML(
          { rid: rec.rid, size: rec.bytes.length, policy: rec.policy },
          { fields: Array.from(selected).join(",") }
        )
      );
  });

  app.get("/api/projection-schema/:rid", (req, res) => {
    const rec = records.get(req.params.rid);
    if (!rec) return res.status(404).send("Not found");
    const fields = String(req.query.fields || "");
    const schema = projectionSchema(
      { rid: rec.rid, size: rec.bytes.length, policy: rec.policy },
      { fields }
    );
    res.json(schema);
  });

  app.get("/api/connection", (_req, res) => {
    const addrs = node.getMultiaddrs().map((a) => a.toString());
    res.json({ peerId: node.peerId.toString(), addresses: addrs });
  });

  app.get("/qr", async (_req, res) => {
    const addrs = node.getMultiaddrs();
    if (!addrs.length) return res.status(500).send("No addresses");
    const target = `${addrs[0].toString()}/p2p/${node.peerId.toString()}`;
    try {
      const png = await QRCode.toBuffer(target, { width: 256 });
      res.type("image/png").send(png);
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.get("/", (_req, res) => {
    const addrs = node.getMultiaddrs().map((a) => `${a}/p2p/${node.peerId}`);
    res.send(
      [
        `<h1>ULP v2.0 P2P (Node)</h1>`,
        `<p>Records: ${records.size}</p>`,
        `<p>Peer: ${node.peerId}</p>`,
        `<pre>${addrs.join("\n")}</pre>`,
        `<p>API: /api/records, /api/record/&lt;RID&gt;, /api/connection, /qr</p>`,
      ].join("")
    );
  });

  app.listen(cfg.port, () => {
    console.log(`HTTP listening on http://localhost:${cfg.port}`);
  });

  if (cfg.verbose) {
    node.addEventListener("peer:connect", (evt) => {
      console.log(`peer connected: ${evt.detail.toString()}`);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
