import ContextSummary from "./ContextSummary";
import MemoryLedger from "./MemoryLedger";
import BindResults, { BindResult } from "./BindResults";
import { FactItem } from "../../api/views";

export type LedgerColumnProps = {
  contextHash: string | null;
  contextMatch: boolean | null;
  facts: FactItem[];
  binds: BindResult[];
};

export default function LedgerColumn({ contextHash, contextMatch, facts, binds }: LedgerColumnProps) {
  return (
    <section className="section">
      <h2>Ledger Column</h2>
      <ContextSummary contextHash={contextHash} contextMatch={contextMatch} />
      <MemoryLedger entries={facts} />
      <BindResults binds={binds} />
    </section>
  );
}
