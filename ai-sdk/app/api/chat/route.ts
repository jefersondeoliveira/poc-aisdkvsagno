import {
  APICallError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { system, tools } from "@/lib/agent";
import { model } from "@/lib/model";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools,
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
