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

## When to pick which

- Product with its own web UI, TypeScript stack, wanting fine control of streaming and rendering: **AI SDK**.
- Agent backend (tools, memory, knowledge, multi-agent, an API that any frontend or service can call), Python stack: **Agno**.
- They are complementary more than competing: an Agno AgentOS API could sit behind an AI SDK frontend (adapter needed, not built here, see spec "Out of scope").

## Limits of this comparison

One model, one small scenario, one run environment. Agno's hosted UI and AI SDK's browser rendering were not exercised by a browser; both were verified through their HTTP APIs. RAG, multi-agent and persistence were out of scope.
