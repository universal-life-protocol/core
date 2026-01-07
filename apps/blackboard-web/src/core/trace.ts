import { stableStringify, sha256Hex } from "./canonical";
import type { ULPTrace } from "./types";

export function canonicalForId(t: Omit<ULPTrace, "id">): string {
  return stableStringify(t);
}

export async function makeTrace(input: {
  kind: string;
  template: string;
  payload: Record<string, unknown>;
  author?: string | null;
  refs?: string[];
  ts?: number;
}): Promise<ULPTrace> {
  const base: Omit<ULPTrace, "id"> = {
    v: 2,
    ts: input.ts ?? Math.floor(Date.now() / 1000),
    kind: input.kind,
    template: input.template,
    author: input.author ?? null,
    payload: input.payload,
    refs: input.refs ?? [],
    sig: null
  };

  const canon = canonicalForId(base);
  const hash = await sha256Hex(canon);
  return { ...base, id: `ulp:v2:${hash}` };
}

export async function validateTrace(
  t: ULPTrace
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (t.v !== 2) return { ok: false, reason: "Unsupported protocol version" };
  if (!t.id.startsWith("ulp:v2:")) return { ok: false, reason: "Bad id prefix" };

  const { id, ...rest } = t;
  const canon = canonicalForId(rest);
  const hash = await sha256Hex(canon);
  const expected = `ulp:v2:${hash}`;
  if (id !== expected) return { ok: false, reason: "ID hash mismatch" };

  return { ok: true };
}
