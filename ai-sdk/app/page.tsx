"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const busy = status === "submitted" || status === "streaming";

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui" }}>
      <h1>AI SDK chat</h1>
      {messages.map((message) => (
        <div key={message.id} style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>
          <strong>{message.role === "user" ? "You" : "AI"}:</strong>
          {message.parts.map((part, i) => {
            const key = `${message.id}-${i}`;
            if (part.type === "text") return <div key={key}>{part.text}</div>;
            if (part.type.startsWith("tool-")) {
              const p = part as { type: string; state: string; input?: unknown; output?: unknown };
              return (
                <pre key={key} style={{ background: "#eee", padding: 8, fontSize: 12 }}>
                  {p.type.slice(5)}({JSON.stringify(p.input)}) [{p.state}]
                  {p.output !== undefined ? ` → ${JSON.stringify(p.output)}` : ""}
                </pre>
              );
            }
            return null;
          })}
        </div>
      ))}
      {error && <p role="alert" style={{ color: "crimson" }}>Error: {error.message}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        style={{ display: "flex", gap: 8, marginTop: 24 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Say something..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </main>
  );
}
