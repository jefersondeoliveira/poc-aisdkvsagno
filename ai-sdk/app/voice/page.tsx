"use client";

import { useRef, useState } from "react";

type Turn = { transcript: string; reply: string; timings: Record<string, number> };

export default function Voice() {
  const [sessionId, setSessionId] = useState("spike-user-1");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function send(body: FormData) {
    setStatus("thinking");
    setError(null);
    body.set("sessionId", sessionId);
    try {
      const res = await fetch("/api/voice", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTurns((t) => [...t, data]);
      new Audio(`data:${data.mediaType};base64,${data.audioBase64}`).play().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setStatus("idle");
    }
  }

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.current.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      const body = new FormData();
      body.set("audio", new Blob(chunks.current, { type: rec.mimeType }), "speech");
      void send(body);
    };
    rec.start();
    recorder.current = rec;
    setStatus("recording");
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui" }}>
      <h1>Voice + text, one Agno session</h1>
      <label>
        Session id:{" "}
        <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
      </label>
      <p>Status: {status}</p>
      <button
        onPointerDown={() => void start()}
        onPointerUp={() => recorder.current?.state === "recording" && recorder.current.stop()}
        disabled={status === "thinking"}
      >
        Hold to talk
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const body = new FormData();
          body.set("text", text);
          setText("");
          void send(body);
        }}
        style={{ display: "flex", gap: 8, margin: "16px 0" }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="or type (same session)" style={{ flex: 1, padding: 8 }} />
        <button type="submit" disabled={status === "thinking" || !text.trim()}>Send</button>
      </form>
      {error && <p role="alert" style={{ color: "crimson" }}>Error: {error}</p>}
      {turns.map((t, i) => (
        <div key={i} style={{ margin: "12px 0" }}>
          <div><strong>You:</strong> {t.transcript}</div>
          <div><strong>AI:</strong> {t.reply}</div>
          <small>{JSON.stringify(t.timings)} ms</small>
        </div>
      ))}
    </main>
  );
}
