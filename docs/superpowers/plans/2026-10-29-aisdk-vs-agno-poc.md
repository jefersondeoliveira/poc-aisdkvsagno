# AI SDK vs Agno POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the same streaming chat agent (two tools) in the Vercel AI SDK and in Agno, run the same test script on both, and document the comparison.

**Architecture:** Two independent apps under `poc/`, each in its framework's native style, sharing only a system prompt file, a test script, and one `.env`. LLM access goes through FAL's OpenAI-compatible router; Ollama `qwen2.5:7b` is the fallback.

**Tech Stack:** Next.js + TypeScript + `ai` + `@ai-sdk/react` + `@ai-sdk/openai-compatible` + vitest; Python 3.13 + `agno` + `fastapi` + pytest; Open-Meteo API; Node 24.

**Spec:** `docs/superpowers/specs/2026-10-29-aisdk-vs-agno-poc-design.md`

## Global Constraints

- Layout: `poc/ai-sdk/`, `poc/agno/`, `poc/shared/`, `poc/.env.example`, `poc/README.md`, `poc/COMPARISON.md`.
- Same model, same system prompt, same two tools on both sides: `get_weather(city)` (Open-Meteo, no key) and `get_current_time(timezone)` (IANA timezone).
- Memory within a session only. No persistence, RAG, multi-agent, auth, or deployment.
- Env vars: `FAL_KEY`, `FAL_BASE_URL`, `FAL_MODEL`. Never read, print, or copy the key from `LivePersona/.env`; the user puts it in `poc/.env`. `.env` is git-ignored.
- Use current releases of both frameworks and check their docs at implementation time; do not rely on memorized APIs.
- Fallback if FAL fails the smoke test: Ollama `qwen2.5:7b` through `http://localhost:11434/v1`.

## Review Focus

- City not found by geocoding (e.g. `Xyzzyville`): tool returns an error result the model can explain, no crash.
- Non-ASCII city (`São Paulo`): geocoding query is URL-encoded and resolves.
- Invalid timezone (`Mars/Base`): tool returns an error result, no crash.
- Open-Meteo unreachable or non-200: tool returns an error result, chat stays alive.
- Empty or whitespace-only user message: no request to the model, no crash.

---

### Task 1: Workspace, shared files, and FAL smoke test

**Files:**
- Create: `poc/.env.example`, `poc/.gitignore`, `poc/shared/system-prompt.txt`, `poc/shared/test-script.md`, `poc/scripts/smoke_fal.sh`

**Interfaces:**
- Produces: env var names `FAL_KEY`, `FAL_BASE_URL`, `FAL_MODEL`; `shared/system-prompt.txt` (plain text, read by both apps); a recorded decision in `.env.example` on whether FAL or Ollama is the provider.

- [ ] **Step 1:** Run `git init` in `poc/`. Create `.gitignore` ignoring `.env`, `node_modules/`, `.next/`, `.venv/`, `__pycache__/`.
- [ ] **Step 2:** Look up the FAL docs for its OpenAI-compatible LLM endpoint (base URL, auth header format, model naming) and write `.env.example` with `FAL_KEY=`, `FAL_BASE_URL=`, `FAL_MODEL=` plus a comment citing the doc URL.
- [ ] **Step 3:** Write `shared/system-prompt.txt` (assistant that answers briefly, uses tools for weather and time, never invents values) and `shared/test-script.md` with the four prompts from the spec: no tool, one tool, both tools, history-dependent follow-up.
- [ ] **Step 4:** Write `scripts/smoke_fal.sh`: loads `poc/.env` without echoing it, sends one streaming chat request with a tool definition to `$FAL_BASE_URL`, prints only HTTP status, whether chunks streamed, and whether a `tool_calls` field appeared.
- [ ] **Step 5:** Ask the user to create `poc/.env` with their key, then run `bash scripts/smoke_fal.sh`. Expected: status 200, streamed chunks, a tool call. If it fails, set the Ollama values in `.env.example`, rerun against Ollama, and record the decision in a comment.
- [ ] **Step 6:** Commit `chore: workspace, shared prompt, provider smoke test`.

### Task 2: AI SDK tools (TDD)

**Files:**
- Create: `poc/ai-sdk/` (via the current Next.js scaffold, TypeScript, App Router, no Tailwind needed), `poc/ai-sdk/lib/tools.ts`, `poc/ai-sdk/lib/tools.test.ts`
- Modify: `poc/ai-sdk/package.json` (add `vitest`, `test` script)

**Interfaces:**
- Produces: `getWeather(city: string, fetchImpl?: typeof fetch): Promise<{ city: string; temperatureC: number; windKmh: number } | { error: string }>`; `getCurrentTime(timezone: string, now?: Date): { timezone: string; iso: string } | { error: string }`.

- [ ] **Step 1:** Scaffold Next.js in `ai-sdk/` and install `ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`, `zod`, `vitest`.
- [ ] **Step 2:** Write failing tests in `tools.test.ts` with a stubbed `fetchImpl`: `returns temperature for a known city`; `url-encodes São Paulo in the geocoding query`; `returns {error} when geocoding finds nothing`; `returns {error} when the forecast response is non-200`; `getCurrentTime returns iso for America/Sao_Paulo given a fixed Date`; `getCurrentTime returns {error} for Mars/Base`.
- [ ] **Step 3:** Run `npx vitest run`. Expected: FAIL, functions not defined.
- [ ] **Step 4:** Implement the two functions in `lib/tools.ts` (Open-Meteo geocoding then forecast; `Intl.DateTimeFormat` for the timezone check).
- [ ] **Step 5:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 6:** Commit `feat(ai-sdk): weather and time tools`.

### Task 3: AI SDK chat route and page

**Files:**
- Create: `poc/ai-sdk/app/api/chat/route.ts`, `poc/ai-sdk/lib/model.ts`
- Modify: `poc/ai-sdk/app/page.tsx`, `poc/ai-sdk/next.config.ts` only if needed to load `../.env`

**Interfaces:**
- Consumes: `getWeather`, `getCurrentTime` from Task 2; `shared/system-prompt.txt`; env vars from Task 1.
- Produces: `POST /api/chat` accepting the `useChat` message format and returning a UI message stream.

- [ ] **Step 1:** `lib/model.ts` exports `model` built with `createOpenAICompatible` from `FAL_BASE_URL`, `FAL_KEY`, `FAL_MODEL` (using the auth header format found in Task 1).
- [ ] **Step 2:** `route.ts`: `POST` calls `streamText` with `model`, the system prompt file contents, both tools defined with zod input schemas that wrap the Task 2 functions, and a step limit of 5 for the tool loop; returns the UI message stream response. Verify the exact API names against the installed `ai` version docs.
- [ ] **Step 3:** `page.tsx`: client component using `useChat`, a text input, a send button disabled on empty or whitespace input, message list rendering text parts, and a visible indicator for tool-call parts (tool name and result).
- [ ] **Step 4:** Run `npm run dev`, open the page, send the four prompts from `shared/test-script.md`. Expected: streamed answers, tool indicators for prompts 2 and 3, prompt 4 uses history.
- [ ] **Step 5:** Send `Clima em Xyzzyville` and a message with FAL unreachable (wrong key). Expected: readable error in the UI, page stays usable.
- [ ] **Step 6:** Commit `feat(ai-sdk): streaming chat with tools`.

### Task 4: Agno tools (TDD)

**Files:**
- Create: `poc/agno/pyproject.toml` (or `requirements.txt`), `poc/agno/tools.py`, `poc/agno/test_tools.py`

**Interfaces:**
- Produces: `get_weather(city: str) -> str` and `get_current_time(timezone: str) -> str` as plain functions with docstrings (Agno derives the tool schema from them); on failure they return a string starting with `Error:`. Internal helper `_fetch_json(url: str) -> dict` is the single HTTP seam tests patch.

- [ ] **Step 1:** Create `.venv` with Python 3.13, install `agno`, `fastapi`, `openai`, `pytest`, `httpx` (check the Agno docs for the current required extras).
- [ ] **Step 2:** Write failing tests in `test_tools.py` patching `_fetch_json`: `test_weather_known_city`; `test_weather_url_encodes_sao_paulo`; `test_weather_city_not_found_returns_error`; `test_weather_http_failure_returns_error`; `test_time_valid_zone` (America/Sao_Paulo, patched clock); `test_time_invalid_zone_returns_error` (Mars/Base).
- [ ] **Step 3:** Run `.venv/bin/pytest -q`. Expected: FAIL, module not defined.
- [ ] **Step 4:** Implement `tools.py` with the same Open-Meteo flow as Task 2 and `zoneinfo.ZoneInfo` for time.
- [ ] **Step 5:** Run `.venv/bin/pytest -q`. Expected: all PASS.
- [ ] **Step 6:** Commit `feat(agno): weather and time tools`.

### Task 5: Agno agent and AgentOS

**Files:**
- Create: `poc/agno/main.py`

**Interfaces:**
- Consumes: tools from Task 4; `shared/system-prompt.txt`; env vars from Task 1.
- Produces: an ASGI app `app` in `main.py` exposing the agent through AgentOS, runnable with the command documented in `README.md`.

- [ ] **Step 1:** In `main.py`, load `poc/.env`, build the model with `OpenAILike` (`id=FAL_MODEL`, `base_url=FAL_BASE_URL`, `api_key=FAL_KEY`, plus any extra header FAL needs), build an `Agent` with the system prompt as instructions, both tools, and in-session history enabled, then wrap it in `AgentOS` and expose `app`. Verify class names and parameters against the installed Agno docs.
- [ ] **Step 2:** Run the server and connect the Agno UI to it following the Agno docs. Send the four prompts from `shared/test-script.md`. Expected: streamed answers, visible tool calls for prompts 2 and 3, prompt 4 uses history.
- [ ] **Step 3:** Repeat the failure cases from Task 3 Step 5 (unknown city, bad key). Expected: readable error, server stays up.
- [ ] **Step 4:** Commit `feat(agno): agent served through AgentOS`.

### Task 6: Measurement, README, and COMPARISON

**Files:**
- Create: `poc/README.md`, `poc/COMPARISON.md`

**Interfaces:**
- Consumes: both working apps and `shared/test-script.md`.

- [ ] **Step 1:** Write `README.md`: setup of `.env`, run commands for each side, how to run the tests.
- [ ] **Step 2:** Measure per side: lines of code excluding lockfiles and generated files (`cloc` or `wc -l`), time from scaffold to first working chat (from your task timestamps), and results for the four test prompts including tool-call reliability over 3 runs each.
- [ ] **Step 3:** Write `COMPARISON.md`: a table with rows for lines of code, time to first chat, streaming, tool calling, memory, UI out of the box, setup friction, docs quality, and per-side strengths; then a short "when to pick which" section. Separate model weaknesses from framework behavior.
- [ ] **Step 4:** Commit `docs: readme and comparison`.

---

## Self-Review

- Spec coverage: layout, shared scenario, both framework sides, credentials, test script, measurement, FAL-endpoint risk (Task 1), version risk (Global Constraints), local-model risk (Task 6 Step 3). No gaps.
- Type consistency: AI SDK tools return objects with `{ error }`; Agno tools return `Error:` strings. Intentional, since each framework serializes tool results differently.
- Review Focus lines are pinned by tests in Tasks 2 and 4; the empty-message case by Task 3 Step 3.
