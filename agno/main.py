import os
from pathlib import Path

from agno.agent import Agent
from agno.db.in_memory import InMemoryDb
from agno.models.openai.like import OpenAILike
from agno.os import AgentOS
from agno.os.interfaces.telegram import Telegram

from tools import get_current_time, get_weather

ROOT = Path(__file__).resolve().parent.parent
os.environ.update(
    {
        k: v
        for k, v in (
            line.split("=", 1)
            for line in (ROOT / ".env").read_text().splitlines()
            if "=" in line and not line.startswith("#")
        )
        if k not in os.environ
    }
)

key = os.environ["FAL_KEY"]
# FAL expects "Authorization: Key <key>"; Ollama (fallback) expects Bearer.
auth = "Bearer ollama" if key == "ollama" else f"Key {key}"

agent = Agent(
    id="chat-agent",
    name="Chat Agent",
    model=OpenAILike(
        id=os.environ["FAL_MODEL"],
        base_url=os.environ["FAL_BASE_URL"],
        api_key=key,
        default_headers={"Authorization": auth},
    ),
    instructions=(ROOT / "shared" / "system-prompt.txt").read_text(),
    tools=[get_weather, get_current_time],
    db=InMemoryDb(),
    add_history_to_context=True,
    num_history_runs=5,
    markdown=True,
)

# Telegram is webhook-only in Agno: needs a public HTTPS URL (see scripts/telegram_webhook.sh).
# Never set APP_ENV=development: it disables the webhook secret check.
interfaces = []
telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN_AGNO")
if telegram_token:
    interfaces.append(Telegram(agent=agent, token=telegram_token))

agent_os = AgentOS(agents=[agent], interfaces=interfaces, telemetry=False)
app = agent_os.get_app()

if __name__ == "__main__":
    agent_os.serve(app="main:app", port=7777)
