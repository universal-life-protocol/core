import { fetchJson } from "./http";

export type TimelineResponse = {
  total: number;
  events: Array<Record<string, unknown>>;
};

export type FactItem = {
  id: string;
  mono: string;
  value: string;
  cite?: string[];
  confidence?: number;
};

export type FactsResponse = {
  total: number;
  items: FactItem[];
};

export type BindsResponse = {
  total: number;
  items: Array<{ claim_id: string; bind: Record<string, unknown> }>;
};

export async function fetchTimeline(limit = 200, offset = 0): Promise<TimelineResponse> {
  return fetchJson<TimelineResponse>(`/views/timeline?limit=${limit}&offset=${offset}`);
}

export async function fetchFacts(limit = 200, offset = 0): Promise<FactsResponse> {
  return fetchJson<FactsResponse>(`/views/facts?limit=${limit}&offset=${offset}`);
}

export async function fetchBinds(limit = 200, offset = 0): Promise<BindsResponse> {
  return fetchJson<BindsResponse>(`/views/binds?limit=${limit}&offset=${offset}`);
}
