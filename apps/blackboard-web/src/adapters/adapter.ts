import type { PublishReceipt, TraceFilter, ULPTrace } from "../core/types";

export interface TransportAdapter {
  name: string;

  publish(traces: ULPTrace[] | ULPTrace): Promise<PublishReceipt>;

  subscribe(filter?: TraceFilter): AsyncIterable<ULPTrace>;

  status(): { connected: boolean; lastError?: string; peerCount?: number };

  close(): void;
}
