import { fetchJson } from "./http";

export type ExplainResponse = {
  hash: string;
  context: {
    stored_hash: string;
    recomputed_hash: string;
    matches: boolean;
    derived_from?: { facts: number; tasks: number };
    serialized: string;
    sig_b64?: string | null;
    signer?: string | null;
  };
  decisions: {
    calls: Array<Record<string, unknown>>;
    binds: Array<{
      claim_id: string | null;
      claim_index: number;
      intr: string;
      mono: string;
      ok: boolean;
      reason: string;
    }>;
  };
  outputs: {
    assistant_messages: Array<Record<string, unknown>>;
  };
  memory: {
    claims: Array<Record<string, unknown>>;
    admits: Array<Record<string, unknown>>;
    rejects: Array<Record<string, unknown>>;
  };
};

export async function fetchExplain(hash: string): Promise<ExplainResponse> {
  return fetchJson<ExplainResponse>(`/explain/${hash}`);
}
