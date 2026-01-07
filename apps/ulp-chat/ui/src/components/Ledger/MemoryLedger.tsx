import LedgerEntry from "./LedgerEntry";
import { FactItem } from "../../api/views";

export type MemoryLedgerProps = {
  entries: FactItem[];
};

export default function MemoryLedger({ entries }: MemoryLedgerProps) {
  return (
    <div className="list">
      <div className="badge">Admitted memory</div>
      {entries.length === 0 ? (
        <div className="card">No admitted memory.</div>
      ) : (
        entries.map((entry) => <LedgerEntry key={entry.id} entry={entry} />)
      )}
    </div>
  );
}
