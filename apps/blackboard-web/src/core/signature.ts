import type { ULPTrace } from "./types";
import { canonicalForId } from "./trace";

export async function verifySignature(trace: ULPTrace): Promise<boolean> {
  if (!trace.sig || !trace.author) return false;

  const subtle = crypto.subtle as SubtleCrypto | undefined;
  if (!subtle) return false;

  try {
    const key = await parsePublicKey(trace.author);
    if (!key) return false;

    const dataBytes = new TextEncoder().encode(canonicalForId(stripId(trace)));
    const sigBytes = hexToBytes(trace.sig);
    const data = toArrayBuffer(dataBytes);
    const sig = toArrayBuffer(sigBytes);

    return await subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      sig,
      data
    );
  } catch {
    return false;
  }
}

function stripId(trace: ULPTrace): Omit<ULPTrace, "id"> {
  const { id, ...rest } = trace;
  return rest;
}

async function parsePublicKey(author: string): Promise<CryptoKey | null> {
  if (!author.startsWith("p256:")) return null;
  const hex = author.slice("p256:".length);
  const bytes = hexToBytes(hex);
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(bytes),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}
