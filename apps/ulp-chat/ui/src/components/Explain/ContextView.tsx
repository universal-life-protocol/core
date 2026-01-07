export type ContextViewProps = {
  serializedContext: string;
  storedHash: string;
  recomputedHash: string;
  matches: boolean;
};

export default function ContextView({
  serializedContext,
  storedHash,
  recomputedHash,
  matches
}: ContextViewProps) {
  return (
    <div className="card">
      <div className="badge">Context view</div>
      <div className="hash">stored: {storedHash}</div>
      <div className="hash">recomputed: {recomputedHash}</div>
      <div className="hash">match: {matches ? "true" : "false"}</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{serializedContext}</pre>
    </div>
  );
}
