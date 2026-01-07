import fs from "fs";
import path from "path";
import crypto from "crypto";

const VIEWS_DIR = path.resolve("views");

function ensureViewsDir() {
  fs.mkdirSync(VIEWS_DIR, { recursive: true });
}

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function writeViews({ facts, tasks, events }) {
  ensureViewsDir();
  const bindsByClaim = {};
  for (const e of events) {
    if (e.kind === "alp.bind" && e.claim_id) {
      bindsByClaim[e.claim_id] = {
        intr: e.intr,
        mono: e.mono,
        ok: e.ok,
        reason: e.reason,
        claim_index: e.claim_index,
        context_hash: e.context_hash
      };
    }
  }

  const summary = [
    "# Summary",
    "",
    "## Facts",
    ...facts.map((f) => `- ${f}`),
    "",
    "## Tasks",
    ...tasks.map((t) => `- ${t}`)
  ].join("\n");

  const summaryPath = path.join(VIEWS_DIR, "current_summary.md");
  const factsPath = path.join(VIEWS_DIR, "facts.json");
  const tasksPath = path.join(VIEWS_DIR, "tasks.json");
  const timelinePath = path.join(VIEWS_DIR, "timeline.json");
  const bindIndexPath = path.join(VIEWS_DIR, "bind_index.json");

  fs.writeFileSync(summaryPath, summary);
  fs.writeFileSync(factsPath, JSON.stringify({ facts }, null, 2));
  fs.writeFileSync(tasksPath, JSON.stringify({ tasks }, null, 2));
  fs.writeFileSync(timelinePath, JSON.stringify({ events }, null, 2));
  fs.writeFileSync(bindIndexPath, JSON.stringify({ binds: bindsByClaim }, null, 2));

  return [
    { path: summaryPath, hash: hashFile(summaryPath) },
    { path: factsPath, hash: hashFile(factsPath) },
    { path: tasksPath, hash: hashFile(tasksPath) },
    { path: timelinePath, hash: hashFile(timelinePath) },
    { path: bindIndexPath, hash: hashFile(bindIndexPath) }
  ];
}
