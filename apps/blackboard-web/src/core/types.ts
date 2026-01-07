export type ULPv2 = 2;

export type ULPTrace = {
  v: ULPv2;
  id: string;
  ts: number;
  kind: string;
  template: string;
  author: string | null;
  payload: Record<string, unknown>;
  refs: string[];
  sig: string | null;
};

export type TraceFilter = {
  templates?: string[];
  kinds?: string[];
  authors?: string[];
  since?: number;
};

export type PublishReceipt = {
  accepted: string[];
  rejected: { id?: string; reason: string }[];
};
