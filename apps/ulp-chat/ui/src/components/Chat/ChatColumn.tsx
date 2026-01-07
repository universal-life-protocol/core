import ChatHistory, { ChatHistoryMessage } from "./ChatHistory";
import ChatInput from "./ChatInput";

export type ChatColumnProps = {
  messages: ChatHistoryMessage[];
  loading: boolean;
  activeContextHash: string | null;
  onSelectHash: (hash: string) => void;
  onSend: (text: string) => Promise<void>;
};

export default function ChatColumn({
  messages,
  loading,
  activeContextHash,
  onSelectHash,
  onSend
}: ChatColumnProps) {
  return (
    <section className="section">
      <h2>Chat Column</h2>
      <ChatHistory messages={messages} onSelectHash={onSelectHash} />
      <ChatInput onSend={onSend} loading={loading} activeContextHash={activeContextHash} />
    </section>
  );
}
