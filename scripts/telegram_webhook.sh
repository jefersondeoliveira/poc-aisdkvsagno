#!/usr/bin/env bash
# Registers the Agno Telegram webhook. Usage: scripts/telegram_webhook.sh https://<public-host>
# The public host must forward to http://localhost:7777 (e.g. `cloudflared tunnel --url http://localhost:7777`).
# Never prints the token or the secret.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${TELEGRAM_BOT_TOKEN_AGNO:?missing in .env}" "${TELEGRAM_WEBHOOK_SECRET_TOKEN:?missing in .env}"
base="${1:?usage: $0 https://<public-host>}"
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_AGNO}/setWebhook" \
  --data-urlencode "url=${base%/}/telegram/webhook" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET_TOKEN}" \
  --data-urlencode "drop_pending_updates=true"
echo
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_AGNO}/getWebhookInfo" | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print('webhook url:', r.get('url'), '| pending:', r.get('pending_update_count'), '| last_error:', r.get('last_error_message'))"
