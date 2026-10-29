#!/usr/bin/env bash
# Smoke test: streaming + tool calling against $FAL_BASE_URL. Never prints the key.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${FAL_KEY:?FAL_KEY missing in .env}"
if [[ "$FAL_KEY" == "ollama" ]]; then AUTH="Bearer ollama"; else AUTH="Key $FAL_KEY"; fi
out=$(mktemp)
code=$(curl -sS -N -o "$out" -w '%{http_code}' "$FAL_BASE_URL/chat/completions" \
  -H "Authorization: $AUTH" -H 'Content-Type: application/json' \
  -d "{\"model\":\"$FAL_MODEL\",\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"What is the weather in Lisbon?\"}],\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"get_weather\",\"description\":\"Get current weather for a city\",\"parameters\":{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}},\"required\":[\"city\"]}}}]}")
echo "status: $code"
echo "stream chunks: $(grep -c '^data:' "$out" || true)"
if grep -q '"tool_calls"' "$out"; then echo "tool_calls: yes"; else echo "tool_calls: NO"; echo "--- body head ---"; head -c 400 "$out"; echo; fi
rm -f "$out"
