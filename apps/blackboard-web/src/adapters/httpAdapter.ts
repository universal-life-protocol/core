import type { PublishReceipt, TraceFilter, ULPTrace } from "../core/types";
import type { TransportAdapter } from "./adapter";

export class HttpAdapter implements TransportAdapter {
  name = "http";
  private baseUrl: string;
  private aborted = false;
  private lastError?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async publish(input: ULPTrace[] | ULPTrace): Promise<PublishReceipt> {
    const traces = Array.isArray(input) ? input : [input];
    try {
      const res = await fetch(`${this.baseUrl}/traces`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ traces })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PublishReceipt;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.lastError = message;
      return {
        accepted: [],
        rejected: traces.map((t) => ({ id: t.id, reason: message }))
      };
    }
  }

  async *subscribe(filter?: TraceFilter): AsyncIterable<ULPTrace> {
    const url = new URL(`${this.baseUrl}/traces/stream`);
    if (filter?.since) url.searchParams.set("since", String(filter.since));
    for (const t of filter?.templates ?? []) url.searchParams.append("template", t);
    for (const k of filter?.kinds ?? []) url.searchParams.append("kind", k);

    while (!this.aborted) {
      try {
        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (!this.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            yield JSON.parse(line) as ULPTrace;
          }
        }
      } catch (e: unknown) {
        this.lastError = e instanceof Error ? e.message : String(e);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  status() {
    return { connected: !this.aborted, lastError: this.lastError };
  }

  close() {
    this.aborted = true;
  }
}
