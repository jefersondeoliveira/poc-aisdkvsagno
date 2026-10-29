import { readFileSync } from "node:fs";
import path from "node:path";
import {
  APICallError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getCurrentTime, getWeather } from "@/lib/tools";
import { model } from "@/lib/model";

const system = readFileSync(
  path.join(process.cwd(), "../shared/system-prompt.txt"),
  "utf8",
);

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      get_weather: tool({
        description: "Get the current weather for a city",
        inputSchema: z.object({ city: z.string().describe("City name") }),
        execute: ({ city }) => getWeather(city),
      }),
      get_current_time: tool({
        description: "Get the current time in an IANA timezone",
        inputSchema: z.object({
          timezone: z.string().describe('IANA timezone, e.g. "Asia/Tokyo"'),
        }),
        execute: async ({ timezone }) => getCurrentTime(timezone),
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        APICallError.isInstance(error)
          ? `Provider error (HTTP ${error.statusCode}): check FAL_KEY / FAL_BASE_URL / FAL_MODEL`
          : error instanceof Error
            ? error.message
            : "Unexpected error",
    }),
  });
}
