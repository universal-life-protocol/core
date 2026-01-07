import { ChatHistoryMessage } from "./ChatHistory";

export type ChatMessageProps = {
  message: ChatHistoryMessage;
  onSelectHash: (hash: string) => void;
};

export default function ChatMessage({ message, onSelectHash }: ChatMessageProps) {
  return (
    <div className="card">
      <div className="badge">{message.role === "user" ? "User" : "Assistant"}</div>
      <p>{message.text}</p>
      {message.context_hash ? (
        <button className="button secondary" onClick={() => onSelectHash(message.context_hash!)}>
          Inspect context
        </button>
      ) : null}
    </div>
  );
}
