import ExplainInspector, { ExplainInspectorProps } from "./ExplainInspector";

export type ExplainColumnProps = ExplainInspectorProps;

export default function ExplainColumn({ explain }: ExplainColumnProps) {
  return (
    <section className="section">
      <h2>Explain Column</h2>
      <ExplainInspector explain={explain} />
    </section>
  );
}
