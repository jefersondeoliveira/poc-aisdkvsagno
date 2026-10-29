export type AgnoConfig = { baseUrl: string; securityKey: string };

export const agnoConfig = (): AgnoConfig => ({
  baseUrl: process.env.AGNO_URL ?? "http://localhost:7777",
  securityKey: process.env.OS_SECURITY_KEY ?? "",
});

// One Agno session per user is the shared context across text and voice.
export async function askAgno(
  message: string,
  sessionId: string,
  config: AgnoConfig = agnoConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const form = new FormData();
  form.set("message", message);
  form.set("session_id", sessionId);
  form.set("stream", "false");
  const res = await fetchImpl(`${config.baseUrl}/agents/chat-agent/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.securityKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Agno request failed with status ${res.status}`);
  const run = await res.json();
  if (run.status === "ERROR") throw new Error(`Agno run error: ${run.content}`);
  return run.content as string;
}
