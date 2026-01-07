import mqtt, { type MqttClient } from "mqtt";
import type { PublishReceipt, TraceFilter, ULPTrace } from "../core/types";
import type { TransportAdapter } from "./adapter";

export type MqttEndpoints = {
  mqtt?: string;
  ws?: string;
};

type QueueItem = {
  trace: ULPTrace;
};

export class MqttAdapter implements TransportAdapter {
  name = "mqtt";
  private endpoints: MqttEndpoints;
  private client: MqttClient | null = null;
  private connected = false;
  private lastError?: string;
  private aborted = false;
  private queue: QueueItem[] = [];
  private queueResolvers: Array<(value: QueueItem | null) => void> = [];
  private topic = "ulp/v2/traces";
  private presenceTopic = "ulp/v2/presence";
  private clientId = `ulp-web-${Math.random().toString(36).slice(2, 10)}`;
  private peers = new Map<string, number>();
  private presenceInterval?: number;
  private presenceTtlMs = 90_000;

  constructor(endpoints: MqttEndpoints) {
    this.endpoints = endpoints;
    this.connect();
  }

  private connect() {
    const url = this.endpoints.ws || this.endpoints.mqtt;
    if (!url) {
      this.lastError = "Missing MQTT endpoint";
      return;
    }

    if (typeof window !== "undefined" && !url.startsWith("ws")) {
      this.lastError = "Browser requires ws:// or wss:// endpoint";
      return;
    }

    this.client = mqtt.connect(url, {
      reconnectPeriod: 1500,
      clientId: this.clientId,
      will: {
        topic: this.presenceTopic,
        payload: JSON.stringify({ id: this.clientId, status: "offline", ts: Date.now() }),
        qos: 0,
        retain: false
      }
    });

    this.client.on("connect", () => {
      this.connected = true;
      this.client?.subscribe(this.topic, { qos: 0 });
      this.client?.subscribe(this.presenceTopic, { qos: 0 });
      this.publishPresence("online");
      this.startPresenceLoop();
    });

    this.client.on("reconnect", () => {
      this.connected = false;
    });

    this.client.on("close", () => {
      this.connected = false;
    });

    this.client.on("error", (err) => {
      this.lastError = err.message;
      this.connected = false;
    });

    this.client.on("message", (_topic, payload) => {
      try {
        if (_topic === this.presenceTopic) {
          const message = JSON.parse(payload.toString()) as {
            id?: string;
            status?: string;
            ts?: number;
          };
          if (!message.id || message.id === this.clientId) return;
          if (message.status === "offline") {
            this.peers.delete(message.id);
            return;
          }
          this.peers.set(message.id, Date.now());
          return;
        }

        const parsed = JSON.parse(payload.toString()) as ULPTrace;
        this.enqueue({ trace: parsed });
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
      }
    });
  }

  private enqueue(item: QueueItem) {
    const resolver = this.queueResolvers.shift();
    if (resolver) resolver(item);
    else this.queue.push(item);
  }

  private async nextQueueItem(): Promise<QueueItem | null> {
    if (this.queue.length) return this.queue.shift() ?? null;
    return new Promise((resolve) => {
      this.queueResolvers.push(resolve);
    });
  }

  async publish(input: ULPTrace[] | ULPTrace): Promise<PublishReceipt> {
    const traces = Array.isArray(input) ? input : [input];
    if (!this.client) {
      const reason = this.lastError ?? "MQTT client not initialized";
      return { accepted: [], rejected: traces.map((t) => ({ id: t.id, reason })) };
    }

    const accepted: string[] = [];
    const rejected: { id?: string; reason: string }[] = [];

    for (const trace of traces) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.client?.publish(this.topic, JSON.stringify(trace), { qos: 0 }, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        accepted.push(trace.id);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        rejected.push({ id: trace.id, reason });
      }
    }

    return { accepted, rejected };
  }

  async *subscribe(filter?: TraceFilter): AsyncIterable<ULPTrace> {
    while (!this.aborted) {
      const next = await this.nextQueueItem();
      if (!next) return;
      const trace = next.trace;
      if (!matchesFilter(trace, filter)) continue;
      yield trace;
    }
  }

  status() {
    this.prunePeers();
    return { connected: this.connected, lastError: this.lastError, peerCount: this.peers.size };
  }

  close() {
    this.aborted = true;
    for (const resolve of this.queueResolvers) resolve(null);
    this.queueResolvers = [];
    this.queue = [];
    this.publishPresence("offline");
    this.stopPresenceLoop();
    this.client?.end(true);
    this.client = null;
  }

  private publishPresence(status: "online" | "offline") {
    if (!this.client) return;
    const payload = JSON.stringify({ id: this.clientId, status, ts: Date.now() });
    this.client.publish(this.presenceTopic, payload, { qos: 0 });
  }

  private startPresenceLoop() {
    this.stopPresenceLoop();
    this.presenceInterval = window.setInterval(() => {
      if (!this.connected) return;
      this.publishPresence("online");
    }, 30_000);
  }

  private stopPresenceLoop() {
    if (this.presenceInterval) {
      window.clearInterval(this.presenceInterval);
      this.presenceInterval = undefined;
    }
  }

  private prunePeers() {
    const now = Date.now();
    for (const [id, ts] of this.peers.entries()) {
      if (now - ts > this.presenceTtlMs) this.peers.delete(id);
    }
  }
}

function matchesFilter(trace: ULPTrace, filter?: TraceFilter) {
  if (!filter) return true;
  if (filter.since != null && trace.ts < filter.since) return false;
  if (filter.templates?.length && !filter.templates.includes(trace.template)) return false;
  if (filter.kinds?.length && !filter.kinds.includes(trace.kind)) return false;
  if (filter.authors?.length && !filter.authors.includes(trace.author ?? "")) return false;
  return true;
}
