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

## Spike: shared context between voice and text

Question: does one persistent Agno session carry context between voice turns and text turns, in both directions? Setup: Agno with `SqliteDb` (`agno/data/agent.db`, git-ignored), one `session_id` per user; text goes straight to the Agno API; voice goes through the Next route `/api/voice` (FAL `whisper` transcription, Agno run, FAL `minimax/speech-02-turbo` speech). Voice here is turn-based, not realtime. Audio inputs were synthesized speech sent to the route, not a real microphone (the `/voice` page with hold-to-talk was written but not exercised in a browser).

| Check | Result |
|---|---|
| Session survives an Agno restart | **Pass** (history reloaded from SQLite; confirmed in the messages sent to the model) |
| Voice states a fact, text recalls it | **Pass**, also after a restart |
| Text states a fact, voice recalls it | **Mixed**: failed twice at first, then 1 of 3 in a controlled rerun |
| Control: text states, text recalls (same API, no voice) | 2 of 3 |
| Typed text through the voice route | 2 of 3 |

Reading: the fact was present in the history sent to the model in the cases inspected, and the failures also happen with plain text. So context sharing and persistence work as designed, and what is unreliable is the model's recall (`google/gemini-2.5-flash` through FAL, with this system prompt). It is not specific to voice. Sample sizes are tiny (3 per path), so no rates should be quoted. A first test also failed for a wording reason: "guarde isso" made the model state it cannot store information, and that refusal stayed in the history and was repeated.

What this means for a complex agent with voice:
- **Recall cannot rely on raw history with this model and prompt.** Follow-up below tests stronger models and Agno's memory.
- **Latency is a blocker for conversational voice in this form.** Per turn: transcription 10 to 14 s, Agno about 1.1 s, speech 3.6 to 4.4 s. A turn-based pipeline is fine for voice notes, not for a live conversation; that needs a realtime provider.
- **FAL `wizper` fails with `@ai-sdk/fal`**: HTTP 422, the provider sends `chunk_level: "word"` and wizper accepts only `segment`. `whisper` works.
- **One identity across channels is something you must design.** Here both channels use the same `session_id` on purpose. Whether Telegram and other Agno interfaces map the same person to that id was not verified.

Not done: realtime voice (phase 2), a real microphone, concurrent users, a stronger model, Agno memory features.

### Follow-up: making recall reliable

Script: `scripts/recall_eval.py`. Per trial it uses a fresh user, states a fact (a pet name), then asks for it in the **same session** (tests history) and in a **new session of the same user** (tests memory). Agno switches added to `agno/main.py` for the experiment: `AGNO_MEMORY=auto|agentic`, `AGENT_PROMPT_FILE`; `FAL_MODEL` selects the model. Defaults are unchanged.

| Configuration | Same session | New session, same user |
|---|---|---|
| gemini-2.5-flash, history only | 15/16 (5/6, then 10/10) | 0/16 |
| gemini-2.5-flash, neutral system prompt | 3/6 | 0/6 |
| gemini-2.5-flash + memory `auto` (extract after every run) | 6/6 | 6/6 |
| gemini-2.5-flash + memory `agentic` (model saves via tool) | 16/16 (6/6, then 10/10) | 16/16 |
| claude-sonnet-4.5, history only | 6/6 | 0/6 |
| gpt-4.1, history only | 6/6 | 0/6 |

What it says:
- **History is per session.** Without memory, a new session of the same user recalls nothing, whatever the model. If voice and text ever land in different sessions, history will not carry the context.
- **Agno's user memory is keyed by `user_id`, not by session.** Both memory modes recalled across sessions. Design for one stable `user_id` per person across channels; that is the part to get right.
- **Memory also stabilized the weak model inside one session** (22/22 across its three memory runs), and the stronger models handled same-session recall with history alone (12/12).
- **The earlier flakiness belongs to gemini-2.5-flash.** It is not a property of the voice path or of the prompt: the neutral prompt did not help (3/6, noise included).
- **Memory costs time and tokens.** For 10 trials of 3 calls each, `agentic` took 52 s against 23 s for history only, because memory is read and written through extra model calls.

Viewed in a browser (`/compare`): both sides also returned an intermittent "Provider returned error" on some turns (a flash-through-FAL issue, not tied to a framework); Agno still saved the memory in one such turn and recalled it in a new session.

Caveats: 6 to 16 trials per row, so these are indications and not rates; one easy fact type (a pet name); no multiple or contradicting facts, long conversations, or memory about voice-specific content. The first `auto` run returned "Provider returned error" on all 6 trials; it did not reproduce on a rerun (6/6 with no errors) and its cause was not found.

## When to pick which

- Product with its own web UI, TypeScript stack, wanting fine control of streaming and rendering: **AI SDK**.
- Agent backend (tools, memory, knowledge, multi-agent, an API that any frontend or service can call), Python stack: **Agno**.
- They are complementary more than competing: an Agno AgentOS API could sit behind an AI SDK frontend (adapter needed, not built here, see spec "Out of scope").

## Limits of this comparison

One model, one small scenario, one run environment. Agno's hosted UI and AI SDK's browser rendering were not exercised by a browser; both were verified through their HTTP APIs. RAG, multi-agent and persistence were out of scope.
