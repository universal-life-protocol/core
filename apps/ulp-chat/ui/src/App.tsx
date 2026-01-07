import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import ChatColumn from "./components/Chat/ChatColumn";
import LedgerColumn from "./components/Ledger/LedgerColumn";
import ExplainColumn from "./components/Explain/ExplainColumn";
import Footer from "./components/Footer";
import { sendChat } from "./api/chat";
import { fetchExplain, ExplainResponse } from "./api/explain";
import { fetchFacts, fetchTimeline, FactItem } from "./api/views";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  context_hash?: string;
};

function mapTimeline(events: Array<Record<string, unknown>>): ChatMessage[] {
  return events
    .filter((e) => e.kind === "msg.user" || e.kind === "msg.assistant")
    .map((e) => ({
      id: String(e.id || e.t || Math.random()),
      role: e.kind === "msg.user" ? "user" : "assistant",
      text: String(e.text || ""),
      context_hash: typeof e.context_hash === "string" ? e.context_hash : undefined
    }));
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [facts, setFacts] = useState<FactItem[]>([]);
  const [activeContextHash, setActiveContextHash] = useState<string | null>(null);
  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshTimeline() {
    const data = await fetchTimeline(200, 0);
    setMessages(mapTimeline(data.events));
  }

  async function refreshFacts() {
    const data = await fetchFacts(200, 0);
    setFacts(data.items);
  }

  async function refreshExplain(hash: string) {
    const data = await fetchExplain(hash);
    setExplain(data);
  }

  useEffect(() => {
    refreshTimeline().catch((err) => setError(err.message));
    refreshFacts().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!activeContextHash) return;
    refreshExplain(activeContextHash).catch((err) => setError(err.message));
  }, [activeContextHash]);

  async function handleSend(text: string) {
    setError(null);
    setLoading(true);
    try {
      const response = await sendChat(text);
      setActiveContextHash(response.context_hash);
      await refreshTimeline();
      await refreshFacts();
      await refreshExplain(response.context_hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  const binds = useMemo(() => explain?.decisions.binds || [], [explain]);

  return (
    <div>
      <Header activeContextHash={activeContextHash} />
      {error ? (
        <div className="card" style={{ margin: "16px clamp(20px, 4vw, 48px)" }}>
          <strong>Request error:</strong> {error}
        </div>
      ) : null}
      <main>
        <ChatColumn
          messages={messages}
          loading={loading}
          activeContextHash={activeContextHash}
          onSelectHash={setActiveContextHash}
          onSend={handleSend}
        />
        <LedgerColumn
          contextHash={activeContextHash}
          contextMatch={explain?.context.matches ?? null}
          facts={facts}
          binds={binds}
        />
        <ExplainColumn explain={explain} />
      </main>
      <Footer />
    </div>
  );
}
