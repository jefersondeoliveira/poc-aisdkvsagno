# AI SDK (Vercel) vs Agno: comparison

Scenario: streaming chat, two tools (Open-Meteo weather, timezone clock), session memory, model `google/gemini-2.5-flash` through FAL. Tested 2026-10-29 with `ai` 7.0.x + Next.js 16 and `agno` 3.1.11.

## What was measured

| | AI SDK | Agno |
|---|---|---|
| App code (excl. tests) | 189 lines (TS/TSX, incl. hand-written chat page) | 105 lines (Python, no frontend) |
| Tool unit tests | 6 pass (vitest) | 6 pass (pytest) |
| Tool-call reliability (prompts 2 and 3, 3 runs each) | 3/3 correct tools | 3/3 correct tools |
| Total latency per answer | ~3.1–3.9 s | ~3.0–5.2 s |
| History follow-up | works | works |
| Unknown city (`Xyzzyville`) | model explains the error | model explains the error |
| Invalid `FAL_KEY` | stream error `Provider error (HTTP 401)…` (needed a custom `onError`; default is the opaque "An error occurred."); server stays up | run returns `status: ERROR`, content `"Unknown model error"`; server stays up |

Latency is dominated by the model and the second LLM step, so it says little about the frameworks. TTFB was not informative (headers arrive immediately). Time to first working chat was not timed rigorously.

## Observed differences

**AI SDK**
- Strength: chat UI layer. `useChat` plus typed message parts (`tool-<name>`) with states give streaming and tool rendering with little code, and you fully control the interface.
- The frontend is code you write (about 60 lines for a basic page) and the server is a route handler you wire (`streamText`, `convertToModelMessages`, `isStepCount`, `toUIMessageStream`).
- v7 API names differ from older versions; the docs ship inside `node_modules/ai/docs`, which made verifying them fast.
- Setup friction: `vitest` 5 conflicted with the scaffold's `@types/node` 20 (peer dependency); fixed by moving to 24.
- Provider setup for FAL needed `@ai-sdk/openai-compatible` with a custom `Authorization: Key …` header.

**Agno**
- Strength: the agent runtime. Tools are plain Python functions whose signature and docstring become the schema; `Agent` + `AgentOS` expose a REST API (`/agents/<id>/runs`, sessions, health) and a streaming event protocol (`RunStarted`, `RunContent`, `ModelRequestStarted`, …) with no route code.
- Session history needed a database object (`InMemoryDb` here); persistence or other databases are a drop-in swap. Telemetry is on by default (turned off here).
- No chat UI in the repo: the provided UI is the hosted os.agno.com, which needs an account; not exercised.
- Smaller footprint for the same backend behavior, but the default error for a bad key is less informative.
- Docs are not bundled with the package; APIs were checked by introspection.

## Multi-channel (Telegram)

Goal: the same agent behind a website chat and chat apps. Telegram was the channel tested.

| | AI SDK (Chat SDK) | Agno (AgentOS interface) |
|---|---|---|
| Code to add the channel | `bot.mts`, 57 lines, plus `lib/agent.ts` shared with the web route | 4 lines in `main.py` (`Telegram(agent=agent, token=…)`), plus a webhook registration script |
| Receiving messages | Long polling: **no public URL needed** | Webhook only: **needs a public HTTPS URL** (tunnel) and an explicit `setWebhook` call with a secret token |
| Extra packages | `chat`, `@chat-adapter/telegram`, `@chat-adapter/state-memory` | `agno[telegram]` |
| State | Separate adapter (memory for dev; Redis/Postgres for production) | Agent's own session db |
| Process model | Separate long-running process (not a Next route) in polling mode | Same server as the API |
| Tested live on Telegram | **Yes**: 4 prompts of the test script answered correctly (reported by the user; not independently observed by me) | **Yes**: same 4 prompts through a Cloudflare quick tunnel; webhook accepted by Telegram with no delivery errors or pending updates |
| Tool activity shown in the chat | **No**: only the final text is posted (Chat SDK extracts text from the stream; tool events are skipped) | **Yes**: the interface prints the tool name when a tool starts and completes (handles `tool_call_started/completed/error`) |
| Securing the public endpoint | Not applicable (polling, no inbound port) | Needed: the tunnel exposes the whole AgentOS. Set `OS_SECURITY_KEY` (and `PyJWT`, not installed by default): API routes then answer 401, while the Telegram webhook is exempt and checks its own secret (403 without it) |

What this says for the "many channels" goal:
- Local development is easier on the AI SDK side because polling needs no tunnel. Agno needs one even to try the channel.
- Agno attaches channels to the same server that exposes the API, so one deployment serves web, REST and Telegram. The AI SDK splits into the Next app plus a bot process (or webhooks on serverless).
- Chat SDK lists more platforms (Teams, Discord, Google Chat, among others) than Agno's built-in interfaces (WhatsApp, Slack, Telegram, plus A2A and AG-UI). Not verified beyond the docs and source.
- Exposing a local Agno server through a tunnel also exposes its other routes; this was protected with `OS_SECURITY_KEY` before opening it, and verified from the public URL (401 on API routes, 403 on the webhook without the secret).
- Visibility of what the agent did differs by default: Agno shows tool calls in Telegram, the AI SDK bot shows only the answer. Whether that is a plus (transparency) or noise depends on the product; with Chat SDK, showing tools would mean writing it yourself.
- Not measured: how the reply is delivered in Telegram (gradual vs. all at once) and whether prompt 4 used history, beyond the user's report that the AI SDK answers were correct. The Agno restriction by user id (`TELEGRAM_ALLOWED_USER_IDS`) was not checked: its interface exposes no such parameter, so that bot is open to anyone who finds the username while the webhook is registered.

## When to pick which

- Product with its own web UI, TypeScript stack, wanting fine control of streaming and rendering: **AI SDK**.
- Agent backend (tools, memory, knowledge, multi-agent, an API that any frontend or service can call), Python stack: **Agno**.
- They are complementary more than competing: an Agno AgentOS API could sit behind an AI SDK frontend (adapter needed, not built here, see spec "Out of scope").

## Limits of this comparison

One model, one small scenario, one run environment. Agno's hosted UI and AI SDK's browser rendering were not exercised by a browser; both were verified through their HTTP APIs. RAG, multi-agent and persistence were out of scope.
