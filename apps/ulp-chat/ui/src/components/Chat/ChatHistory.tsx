import ChatMessage from "./ChatMessage";

export type ChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  context_hash?: string;
};

export type ChatHistoryProps = {
  messages: ChatHistoryMessage[];
  onSelectHash: (hash: string) => void;
};

export default function ChatHistory({ messages, onSelectHash }: ChatHistoryProps) {
  return (
    <div className="list">
      {messages.length === 0 ? (
        <div className="card">No messages yet.</div>
      ) : (
        messages.map((message) => (
          <ChatMessage key={message.id} message={message} onSelectHash={onSelectHash} />
        ))
      )}
    </div>
  );
}
