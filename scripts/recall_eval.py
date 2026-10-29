"""Recall experiment against a running Agno server.

Per trial: state a fact (new pet name), then ask for it
  - in the SAME session (tests history), and
  - in a NEW session of the same user (tests memory).
Usage: agno/.venv/bin/python scripts/recall_eval.py <label> [trials]
"""
import os
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
env = dict(
    line.split("=", 1)
    for line in (ROOT / ".env").read_text().splitlines()
    if "=" in line and not line.startswith("#")
)
HEADERS = {"Authorization": f"Bearer {env['OS_SECURITY_KEY']}"}
NAMES = ["Mia", "Luna", "Rex", "Nina", "Bela", "Zeca", "Thor", "Mel", "Bob", "Lola"]


def run(message: str, session_id: str, user_id: str) -> str:
    r = httpx.post(
        "http://localhost:7777/agents/chat-agent/runs",
        headers=HEADERS,
        data={"message": message, "session_id": session_id, "user_id": user_id, "stream": "false"},
        timeout=120,
    )
    r.raise_for_status()
    body = r.json()
    if body.get("status") == "ERROR":
        raise RuntimeError(body.get("content"))
    return body.get("content") or ""


label = sys.argv[1]
trials = int(sys.argv[2]) if len(sys.argv) > 2 else 6
stamp = int(time.time())
same = cross = errors = 0
start = time.time()
for i in range(trials):
    name = NAMES[i % len(NAMES)]
    user = f"u-{label}-{stamp}-{i}"
    try:
        run(f"Meu gato se chama {name}.", f"s1-{user}", user)
        same += name.lower() in run("Qual é o nome do meu gato?", f"s1-{user}", user).lower()
        cross += name.lower() in run("Qual é o nome do meu gato?", f"s2-{user}", user).lower()
    except Exception as e:
        errors += 1
        print(f"  trial {i} error: {e}")
print(f"{label}: same-session {same}/{trials} | new-session {cross}/{trials} | errors {errors} | {time.time()-start:.0f}s")
