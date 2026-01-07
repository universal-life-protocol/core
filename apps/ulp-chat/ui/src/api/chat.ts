import { fetchJson } from "./http";

export type ChatResponse = {
  reply: string;
  context_hash: string;
  admitted_memory: Array<{ id: string; mono: string; value: string }>;
  claim_decisions: Array<{
    index: number;
    mono: string;
    ok: boolean;
    reason: string;
    claim_id: string | null;
  }>;
};

export async function sendChat(text: string): Promise<ChatResponse> {
  return fetchJson<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
}
