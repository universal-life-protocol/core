import fs from "fs";
import path from "path";
import crypto from "crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const keysDir = path.resolve("keys");
fs.mkdirSync(keysDir, { recursive: true });

fs.writeFileSync(path.join(keysDir, "public.pem"), publicKey.export({ type: "spki", format: "pem" }));
fs.writeFileSync(path.join(keysDir, "private.pem"), privateKey.export({ type: "pkcs8", format: "pem" }));

console.log("Wrote keys/public.pem and keys/private.pem");
