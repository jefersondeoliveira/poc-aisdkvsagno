export type AgnoConfig = { baseUrl: string; securityKey: string };
export type AgnoRun = { content: string; tools: string[] };

export const agnoConfig = (): AgnoConfig => ({
  baseUrl: process.env.AGNO_URL ?? "http://localhost:7777",
  securityKey: process.env.OS_SECURITY_KEY ?? "",
});

// One Agno session per user is the shared context across text and voice;
// user_id is what Agno's memory is keyed on.
export async function runAgno(
  message: string,
  ids: { sessionId: string; userId?: string },
  config: AgnoConfig = agnoConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<AgnoRun> {
  const form = new FormData();
  form.set("message", message);
  form.set("session_id", ids.sessionId);
  if (ids.userId) form.set("user_id", ids.userId);
  form.set("stream", "false");
  const res = await fetchImpl(`${config.baseUrl}/agents/chat-agent/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.securityKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Agno request failed with status ${res.status}`);
  const run = await res.json();
  if (run.status === "ERROR") throw new Error(`Agno run error: ${run.content}`);
  const names: string[] = (run.tools ?? []).map((t: { tool_name: string }) => t.tool_name);
  return { content: run.content as string, tools: [...new Set(names)] };
}

export async function askAgno(
  message: string,
  sessionId: string,
  config: AgnoConfig = agnoConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  return (await runAgno(message, { sessionId }, config, fetchImpl)).content;
}
