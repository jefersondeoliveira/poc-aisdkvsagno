"use client";

import { useEffect, useState } from "react";

type Side = { reply?: string; tools: string[]; ms: number; error?: string };
type Turn = { prompt: string; aisdk: Side; agno: Side };
type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Qual o clima em São Paulo agora?",
  "Qual o clima e que horas são em Tokyo (Asia/Tokyo)?",
  "Meu gato se chama Mia.",
  "Qual é o nome do meu gato?",
];

export default function Compare() {
  // Ids are random, so they are created after mount to keep server and client markup identical.
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  useEffect(() => {
    setUserId(`user-${crypto.randomUUID().slice(0, 8)}`);
    setSessionId(`session-${crypto.randomUUID().slice(0, 8)}`);
  }, []);
  const [history, setHistory] = useState<Msg[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(prompt: string) {
    if (!prompt.trim() || busy || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history, sessionId, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTurns((t) => [...t, { prompt, aisdk: data.aisdk, agno: data.agno }]);
      if (data.aisdk.reply)
        setHistory((h) => [...h, { role: "user", content: prompt }, { role: "assistant", content: data.aisdk.reply }]);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  function newSession() {
    setSessionId(`session-${crypto.randomUUID().slice(0, 8)}`);
    setHistory([]);
    setTurns((t) => [...t, { prompt: "— new session, same user —", aisdk: { tools: [], ms: 0 }, agno: { tools: [], ms: 0 } }]);
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui" }}>
      <h1>AI SDK vs Agno, same prompt</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        user <code>{userId}</code> · session <code>{sessionId}</code>. AI SDK keeps history in the browser (no memory);
        Agno keeps session history and user memory on the server. Click &quot;New session&quot; and ask what you said
        before: Agno should still remember if its memory is on.
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={busy || !userId} style={{ fontSize: 12 }}>{s}</button>
        ))}
        <button onClick={newSession} disabled={busy || !userId} style={{ fontSize: 12, marginLeft: "auto" }}>New session (same user)</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask both agents..." style={{ flex: 1, padding: 8 }} />
        <button type="submit" disabled={busy || !userId || !input.trim()}>{busy ? "Asking both..." : "Send"}</button>
      </form>
      {error && <p role="alert" style={{ color: "crimson" }}>Error: {error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <strong>AI SDK</strong>
        <strong>Agno</strong>
        {turns.map((t, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #ddd", paddingTop: 8, fontSize: 13, color: "#444" }}>{t.prompt}</div>
            {(["aisdk", "agno"] as const).map((k) => (
              <div key={k} style={{ whiteSpace: "pre-wrap" }}>
                {t[k].error ? (
                  <span style={{ color: "crimson" }}>Error: {t[k].error}</span>
                ) : (
                  t[k].reply
                )}
                {t[k].ms > 0 && (
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {t[k].tools.map((n) => (
                      <span key={n} style={{ background: "#e8eefc", padding: "1px 6px", borderRadius: 8, marginRight: 4 }}>{n}</span>
                    ))}
                    {(t[k].ms / 1000).toFixed(1)} s
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
