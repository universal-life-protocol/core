import { ExplainResponse } from "../../api/explain";
import ContextView from "./ContextView";
import AdmissibilityView from "./AdmissibilityView";
import ShadowView from "./ShadowView";
import HashVerification from "./HashVerification";

export type ExplainInspectorProps = {
  explain: ExplainResponse | null;
};

export default function ExplainInspector({ explain }: ExplainInspectorProps) {
  if (!explain) {
    return <div className="card">Select a context hash to inspect.</div>;
  }

  return (
    <div className="list">
      <ContextView
        serializedContext={explain.context.serialized}
        storedHash={explain.context.stored_hash}
        recomputedHash={explain.context.recomputed_hash}
        matches={explain.context.matches}
      />
      <AdmissibilityView binds={explain.decisions.binds} />
      <ShadowView shadows={[]} />
      <HashVerification
        hash={explain.context.stored_hash}
        signature={explain.context.sig_b64 || undefined}
        signer={explain.context.signer || undefined}
        matches={explain.context.matches}
      />
    </div>
  );
}
