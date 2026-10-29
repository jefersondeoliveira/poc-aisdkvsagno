# POC: AI SDK (Vercel) vs Agno — Design

Date: 2026-10-29

## Goal

Implement the same chat-agent scenario in both frameworks and compare what each does best, with the chat web experience (streaming, tools, UI) as the main axis. The output is two working apps plus a `COMPARISON.md`.

- AI SDK: https://ai-sdk.dev/docs/introduction (TypeScript)
- Agno: https://github.com/agno-agi/agno (Python)

## Decisions already made

- Approach A: each framework in its native style, no shared frontend.
- Same scenario, same model, same system prompt, same tools on both sides.
- LLM access through FAL (OpenAI-compatible router). Fallback: local Ollama `qwen2.5:7b` (installed; has tool calling).
- Evaluation covers developer experience, agent features and chat UX, ending in a comparison table.

## Out of scope

- Shared frontend or an adapter between the two streaming protocols.
- Cross-session persistence, RAG, multi-agent, auth, deployment.
  (If Agno provides persistence nearly for free, note it in the comparison but do not build it for AI SDK.)

## Layout

```
poc/
├── README.md          # how to run both
├── COMPARISON.md      # final comparison table
├── .env.example       # FAL_KEY, FAL_BASE_URL, FAL_MODEL
├── .gitignore         # ignores .env
├── ai-sdk/            # Next.js + TypeScript
└── agno/              # Python + AgentOS
```

Each side is independent, with its own dependencies and run commands.

## Shared scenario

- Chat agent with streaming responses, one shared system prompt, one shared model.
- Tools (identical behavior on both sides):
  - `get_weather(city)`: calls Open-Meteo (public, no key).
  - `get_current_time(timezone)`: returns the current time in an IANA timezone.
- Conversation memory within a session only.

## AI SDK side (`ai-sdk/`)

- Route `/api/chat` using `streamText`, the two tools, and `stopWhen` for the tool-calling loop.
- Page using `useChat`, rendering messages, tool calls and streaming.
- Provider: `@ai-sdk/openai-compatible` pointed at the FAL base URL.

## Agno side (`agno/`)

- `Agent` with the same tools, model via `OpenAILike` with the FAL `base_url`, session history enabled.
- Served through AgentOS (FastAPI) and used from the Agno UI.

## Credentials

- `FAL_KEY` lives in a git-ignored `.env` at `poc/` root. The key is never read, printed or copied from `LivePersona/.env` by tooling; the user supplies it.
- `.env.example` documents `FAL_KEY`, `FAL_BASE_URL`, `FAL_MODEL`.

## Verification and measurement

Same test script on both sides:

1. Simple question, no tool.
2. Question that needs one tool.
3. Question that needs both tools.
4. Follow-up that depends on conversation history.

Recorded per side: lines of code, time to first working chat, streaming quality, tool-calling reliability with the chosen model, friction points. Results go into `COMPARISON.md`.

## Risks and first steps for the plan

- **FAL endpoint:** before fixing config, confirm in the FAL docs the endpoint, OpenAI-compatible format, and support for streaming and tool calling for the chosen model. If unsupported, use Ollama (`qwen2.5:7b`) via its OpenAI-compatible endpoint.
- **Versions:** use current releases of both frameworks and check their docs at implementation time; both move quickly.
- **Local model limits:** a 7B model may call tools unreliably. Record this as a finding and separate model weakness from framework behavior.
