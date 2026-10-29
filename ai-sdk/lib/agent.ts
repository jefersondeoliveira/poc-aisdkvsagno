import { readFileSync } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { getCurrentTime, getWeather } from "./tools";

// Shared by the web route (app/api/chat) and the Telegram bot (bot.ts).
export const system = readFileSync(
  path.join(process.cwd(), "../shared/system-prompt.txt"),
  "utf8",
);

export const tools = {
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
};
