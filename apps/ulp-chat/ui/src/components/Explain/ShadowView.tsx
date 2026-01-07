export type ShadowViewProps = {
  shadows: Array<{ monomial: string; shadow: string }>;
};

export default function ShadowView({ shadows }: ShadowViewProps) {
  if (!shadows || shadows.length === 0) {
    return (
      <div className="card">
        <div className="badge">Shadow view</div>
        <p>No shadow edges reported.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="badge">Shadow view</div>
      {shadows.map((s) => (
        <div key={`${s.monomial}-${s.shadow}`} className="hash">
          {s.monomial} → {s.shadow}
        </div>
      ))}
    </div>
  );
}
