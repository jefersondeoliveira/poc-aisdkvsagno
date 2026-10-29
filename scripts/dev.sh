#!/usr/bin/env bash
# Starts both apps: AI SDK (http://localhost:3000) and Agno AgentOS (http://localhost:7777).
# Installs dependencies on first run. Ctrl+C stops both.
# Agno runs with user memory on (AGNO_MEMORY=agentic) so /compare can show cross-session memory;
# override with AGNO_MEMORY=auto, or AGNO_MEMORY= to turn it off.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "Missing .env: run 'cp .env.example .env' and set FAL_KEY" >&2; exit 1; }

[[ -d ai-sdk/node_modules ]] || (cd ai-sdk && npm install)
if [[ ! -d agno/.venv ]]; then
  python3 -m venv agno/.venv
  agno/.venv/bin/pip install -q -r agno/requirements.txt
fi

set -m  # each job gets its own process group, so we can stop npm/python and their children
pids=()
stop() { trap - EXIT INT TERM; for p in "${pids[@]}"; do kill -- "-$p" 2>/dev/null || true; done; }
trap stop EXIT INT TERM

(cd ai-sdk && npm run dev 2>&1 | sed -u 's/^/[ai-sdk] /') &
pids+=($!)
(cd agno && AGNO_MEMORY="${AGNO_MEMORY-agentic}" .venv/bin/python main.py 2>&1 | sed -u 's/^/[agno]   /') &
pids+=($!)

echo "AI SDK: http://localhost:3000   Agno: http://localhost:7777  (Ctrl+C to stop)"
wait
