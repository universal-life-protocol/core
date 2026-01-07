import type { TraceFilter, ULPTrace } from "./types";

export function projectFeed(traces: ULPTrace[], filter?: TraceFilter): ULPTrace[] {
  let out = traces.slice();

  if (filter?.since != null) out = out.filter((t) => t.ts >= filter.since!);
  if (filter?.templates?.length) out = out.filter((t) => filter.templates!.includes(t.template));
  if (filter?.kinds?.length) out = out.filter((t) => filter.kinds!.includes(t.kind));
  if (filter?.authors?.length) {
    out = out.filter((t) => t.author && filter.authors!.includes(t.author));
  }

  out.sort((a, b) => (b.ts - a.ts) || (a.id < b.id ? -1 : 1));
  return out;
}
