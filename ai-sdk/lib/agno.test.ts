import { describe, expect, it } from "vitest";
import { askAgno, runAgno } from "./agno";

function stub(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { impl, calls };
}

const cfg = { baseUrl: "http://agno.test", securityKey: "k3y" };

describe("askAgno", () => {
  it("posts message and session id with the bearer key and returns content", async () => {
    const { impl, calls } = stub(200, { content: "Thor" });
    const reply = await askAgno("Qual o nome?", "sess-1", cfg, impl);
    expect(reply).toBe("Thor");
    expect(calls[0].url).toBe("http://agno.test/agents/chat-agent/runs");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer k3y");
    const form = calls[0].init.body as FormData;
    expect(form.get("message")).toBe("Qual o nome?");
    expect(form.get("session_id")).toBe("sess-1");
    expect(form.get("stream")).toBe("false");
  });

  it("throws with the status when Agno answers non-200", async () => {
    const { impl } = stub(401, { detail: "unauthorized" });
    await expect(askAgno("oi", "s", cfg, impl)).rejects.toThrow("401");
  });

  it("throws when the run finished with status ERROR", async () => {
    const { impl } = stub(200, { status: "ERROR", content: "Unknown model error" });
    await expect(askAgno("oi", "s", cfg, impl)).rejects.toThrow("Unknown model error");
  });
});

describe("runAgno", () => {
  it("returns the reply and the distinct tool names, sending user_id", async () => {
    const { impl, calls } = stub(200, {
      content: "Sao Paulo: 22C",
      tools: [{ tool_name: "get_weather" }, { tool_name: "get_current_time" }, { tool_name: "get_weather" }],
    });
    const run = await runAgno("clima?", { sessionId: "s", userId: "u1" }, cfg, impl);
    expect(run).toEqual({ content: "Sao Paulo: 22C", tools: ["get_weather", "get_current_time"] });
    expect((calls[0].init.body as FormData).get("user_id")).toBe("u1");
  });

  it("returns an empty tool list when the run used no tools", async () => {
    const { impl } = stub(200, { content: "oi" });
    expect((await runAgno("oi", { sessionId: "s", userId: "u" }, cfg, impl)).tools).toEqual([]);
  });
});
