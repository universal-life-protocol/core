import fs from "fs";
import crypto from "crypto";

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

if (process.argv.length < 4) {
  console.error("Usage: node bin/verify-context.js <context.json> <expected_hash>");
  process.exit(1);
}

const file = process.argv[2];
const expected = process.argv[3];
const text = fs.readFileSync(file, "utf8");
const normalized = text.replace(/\r\n/g, "\n");
const got = sha256Hex(normalized);

if (got === expected) {
  console.log("OK", got);
  process.exit(0);
} else {
  console.log("MISMATCH");
  console.log("expected:", expected);
  console.log("got     :", got);
  process.exit(2);
}
