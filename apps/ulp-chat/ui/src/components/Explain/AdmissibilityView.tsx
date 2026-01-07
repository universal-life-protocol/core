import { BindResult } from "../Ledger/BindResults";

export type AdmissibilityViewProps = {
  binds: BindResult[];
};

export default function AdmissibilityView({ binds }: AdmissibilityViewProps) {
  return (
    <div className="card">
      <div className="badge">Admissibility</div>
      {binds.length === 0 ? (
        <p>No bind decisions.</p>
      ) : (
        binds.map((bind) => (
          <div key={bind.intr} style={{ marginBottom: "8px" }}>
            <strong>{bind.intr}</strong>: {bind.ok ? "ok" : "rejected"} ({bind.reason})
          </div>
        ))
      )}
    </div>
  );
}
