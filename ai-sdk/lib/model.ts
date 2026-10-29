import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const key = process.env.FAL_KEY ?? "";

// FAL expects "Authorization: Key <key>"; Ollama (fallback) expects Bearer.
const provider = createOpenAICompatible({
  name: "fal",
  baseURL: process.env.FAL_BASE_URL ?? "",
  headers: { Authorization: key === "ollama" ? "Bearer ollama" : `Key ${key}` },
});

export const model = provider.chatModel(process.env.FAL_MODEL ?? "");
