# POC: Vercel AI SDK vs Agno

Same streaming chat agent (tools `get_weather`, `get_current_time`) built in both frameworks, same model through FAL. Results: [COMPARISON.md](COMPARISON.md). Design and plan: `docs/superpowers/`.

## Setup

```bash
cp .env.example .env     # then set FAL_KEY (never commit .env)
bash scripts/smoke_fal.sh  # expect: status 200, stream chunks, tool_calls: yes
```

Fallback to local Ollama: set `FAL_BASE_URL=http://localhost:11434/v1`, `FAL_MODEL=qwen2.5:7b`, `FAL_KEY=ollama`.

## Run both at once

```bash
bash scripts/dev.sh   # AI SDK on :3000, Agno on :7777; installs deps on first run; Ctrl+C stops both
```

After `scripts/dev.sh`, open `http://localhost:3000` (the home: verdict, architecture, differences, links) and then:
- `http://localhost:3000/compare`: **same prompt to both agents side by side** (answer, tools used, time). "New session (same user)" shows the memory difference. Agno runs with `AGNO_MEMORY=agentic` here.
- `http://localhost:3000`: AI SDK chat. `http://localhost:3000/voice`: voice and text on one Agno session (not yet exercised with a real microphone).

## AI SDK (Next.js, TypeScript)

```bash
cd ai-sdk && npm install
npm run dev        # http://localhost:3000
npm test           # tool unit tests
```

## Agno (Python, AgentOS)

```bash
cd agno && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python main.py     # AgentOS API on http://localhost:7777
.venv/bin/pytest -q          # tool unit tests
```

Try it: `curl -N -X POST localhost:7777/agents/chat-agent/runs -F "message=Clima em Lisboa?" -F stream=true`.
The Agno UI (os.agno.com) can connect to the local AgentOS endpoint; it needs an Agno account and was not exercised here.

## Test script

`shared/test-script.md`, identical for both.
