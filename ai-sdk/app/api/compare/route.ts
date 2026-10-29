import { generateText, isStepCount, type ModelMessage } from "ai";
import { runAgno } from "@/lib/agno";
import { system, tools } from "@/lib/agent";
import { model } from "@/lib/model";

type Side = { reply?: string; tools: string[]; ms: number; error?: string };

async function timed(run: () => Promise<{ reply: string; tools: string[] }>): Promise<Side> {
  const start = Date.now();
  try {
    return { ...(await run()), ms: Date.now() - start };
  } catch (e) {
    return { tools: [], ms: Date.now() - start, error: e instanceof Error ? e.message : "failed" };
  }
}

// Same prompt to both agents, in parallel. The AI SDK side is stateless: the client sends its
// history. The Agno side keeps state itself (session + memory keyed by user_id).
export async function POST(req: Request) {
  const { message, history, sessionId, userId } = (await req.json()) as {
    message: string;
    history: ModelMessage[];
    sessionId: string;
    userId: string;
  };
  if (!message?.trim()) return Response.json({ error: "empty message" }, { status: 400 });

  const [aisdk, agno] = await Promise.all([
    timed(async () => {
      const result = await generateText({
        model,
        system,
        messages: [...history, { role: "user", content: message }],
        tools,
        stopWhen: isStepCount(5),
      });
      const names = result.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
      return { reply: result.text, tools: [...new Set(names)] };
    }),
    timed(async () => {
      const run = await runAgno(message, { sessionId, userId });
      return { reply: run.content, tools: run.tools };
    }),
  ]);
  return Response.json({ aisdk, agno });
}
