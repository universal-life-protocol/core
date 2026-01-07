import fs from "fs";
import crypto from "crypto";

if (process.argv.length < 5) {
  console.error("Usage: node bin/verify-signature.js <hashHex> <sigBase64> <public.pem>");
  process.exit(1);
}

const hashHex = process.argv[2];
const sigB64 = process.argv[3];
const pubPath = process.argv[4];

const pub = fs.readFileSync(pubPath, "utf8");
const ok = crypto.verify(
  null,
  Buffer.from(hashHex, "utf8"),
  pub,
  Buffer.from(sigB64, "base64")
);

console.log(ok ? "OK" : "BAD");
process.exit(ok ? 0 : 2);
