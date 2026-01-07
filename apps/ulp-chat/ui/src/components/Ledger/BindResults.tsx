export type BindResult = {
  claim_id: string | null;
  claim_index: number;
  intr: string;
  mono: string;
  ok: boolean;
  reason: string;
};

export type BindResultsProps = {
  binds: BindResult[];
};

export default function BindResults({ binds }: BindResultsProps) {
  return (
    <div className="list">
      <div className="badge">Bind results</div>
      {binds.length === 0 ? (
        <div className="card">No bind results loaded.</div>
      ) : (
        binds.map((bind) => (
          <div key={bind.intr} className="card">
            <div className="mono">{bind.intr}</div>
            <p>{bind.ok ? "ok" : "rejected"}</p>
            <div className="hash">{bind.mono}</div>
            <div className="hash">{bind.reason}</div>
          </div>
        ))
      )}
    </div>
  );
}
