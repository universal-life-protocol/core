import { useState } from "react";
import type { FormEvent } from "react";

export type ChatInputProps = {
  onSend: (text: string) => Promise<void>;
  loading: boolean;
  activeContextHash: string | null;
};

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [text, setText] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const next = text;
    setText("");
    await onSend(next);
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="chat-input">Write to ledger</label>
      <textarea
        id="chat-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Write a message to enter the trace..."
      />
      <button className="button" type="submit" disabled={loading}>
        {loading ? "Posting..." : "Post"}
      </button>
    </form>
  );
}
