// Telegram bot for the AI SDK side. Long-running process (polling): `npm run bot`.
// Reuses the same model, system prompt and tools as the web route.
import { createMemoryState } from "@chat-adapter/state-memory";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { isStepCount, ToolLoopAgent } from "ai";
import { Chat } from "chat";
import { toAiMessages } from "chat/ai";

try {
  process.loadEnvFile("../.env");
} catch {}

const botToken = process.env.TELEGRAM_BOT_TOKEN_AISDK;
if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN_AISDK missing in .env");

const { model } = await import("./lib/model");
const { system, tools } = await import("./lib/agent");

const agent = new ToolLoopAgent({
  model,
  instructions: system,
  tools,
  stopWhen: isStepCount(5),
});

const telegram = createTelegramAdapter({ botToken, mode: "polling" });

const bot = new Chat({
  userName: process.env.TELEGRAM_BOT_USERNAME_AISDK ?? "poc_aisdk_bot",
  adapters: { telegram },
  state: createMemoryState(),
});

bot.onDirectMessage(async (thread, message) => {
  if (!message.text?.trim()) return;
  try {
    const { messages } = await bot.history.thread.list(thread.id, { limit: 20 });
    const result = await agent.stream({
      messages: await toAiMessages(messages),
      abortSignal: thread.signal,
    });
    await thread.post(result.fullStream);
  } catch (error) {
    console.error("[bot] turn failed:", error);
    await thread.post(
      `Error: ${error instanceof Error ? error.message : "unexpected failure"}`,
    );
  }
});

await bot.initialize();
console.log(`[bot] AI SDK Telegram bot running (${telegram.runtimeMode})`);
