export type HashVerificationProps = {
  hash: string;
  signature?: string;
  signer?: string;
  matches: boolean;
};

export default function HashVerification({ hash, signature, signer, matches }: HashVerificationProps) {
  return (
    <div className="card">
      <div className="badge">Hash verification</div>
      <div className="hash">hash: {hash}</div>
      <div className="hash">match: {matches ? "true" : "false"}</div>
      {signature ? (
        <div className="hash">signature: {signature}</div>
      ) : (
        <div className="hash">signature: none</div>
      )}
      {signer ? <div className="hash">signer: {signer}</div> : null}
    </div>
  );
}
