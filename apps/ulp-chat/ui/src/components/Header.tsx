export type HeaderProps = {
  activeContextHash: string | null;
};

export default function Header({ activeContextHash }: HeaderProps) {
  return (
    <header>
      <h1>ULP Ledger Console</h1>
      <p>
        Active context hash: {" "}
        <span className="hash">{activeContextHash || "none"}</span>
      </p>
    </header>
  );
}
