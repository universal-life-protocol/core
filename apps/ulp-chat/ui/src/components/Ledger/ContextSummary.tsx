export type ContextSummaryProps = {
  contextHash: string | null;
  contextMatch: boolean | null;
};

export default function ContextSummary({ contextHash, contextMatch }: ContextSummaryProps) {
  let status = "No context";
  if (contextMatch === true) status = "Hash match";
  if (contextMatch === false) status = "Hash mismatch";

  return (
    <div className="card">
      <div className="badge">Context</div>
      <div className="hash">{contextHash || "none"}</div>
      <p>{status}</p>
    </div>
  );
}
