import { FactItem } from "../../api/views";

export type LedgerEntryProps = {
  entry: FactItem;
};

export default function LedgerEntry({ entry }: LedgerEntryProps) {
  return (
    <div className="card">
      <div className="mono">{entry.mono}</div>
      <p>{entry.value}</p>
      {entry.cite && entry.cite.length > 0 ? (
        <div className="hash">cite: {entry.cite.join(", ")}</div>
      ) : null}
      {typeof entry.confidence === "number" ? (
        <div className="hash">confidence: {entry.confidence.toFixed(2)}</div>
      ) : null}
    </div>
  );
}
