# POC: Vercel AI SDK vs Agno

Comparação prática de duas ferramentas para construir agentes de IA, com o mesmo cenário implementado nas duas: um chat com streaming, duas tools (clima e hora), memória de conversa, canais (web, Telegram) e voz. O modelo é o mesmo nos dois lados, roteado pela FAL.

- **[AI SDK](https://ai-sdk.dev/docs/introduction)** (Vercel, TypeScript): `ai-sdk/`
- **[Agno](https://github.com/agno-agi/agno)** (Python): `agno/`

## Conclusão

Para um agente **complexo**, em **vários canais** (site, Telegram, WhatsApp, Slack) e com **texto e voz compartilhando contexto**, o recomendado é usar os **dois em conjunto**:

- **Agno** como núcleo do agente: tools, sessão persistente, memória por `user_id`, interfaces de canal.
- **AI SDK** na ponta web e de voz, chamando o Agno por API.

**Se o seu critério for controle e baixo acoplamento**, a alternativa é o **AI SDK como núcleo, com uma camada de memória sua** (por exemplo Postgres e vetores, por `user_id`). Ganha-se liberdade; paga-se construindo memória, identidade entre canais e persistência: sem memória, a lembrança em sessão nova foi 0/16, contra 16/16 no Agno. Não foi testado construir essa camada, nem usar o Agno só como biblioteca (sem AgentOS).

Para um chat simples só no site, o AI SDK sozinho basta. Para um backend de agentes em Python sem interface própria, o Agno sozinho basta. Os números, as tabelas e as ressalvas estão em [COMPARISON.md](COMPARISON.md). Tudo isso também está na home do app (`/`), com os diagramas de arquitetura.

> A recomendação é raciocinada, não totalmente medida. **Não foi provado:** voz em tempo real, o mesmo `user_id` entre canais diferentes, Slack, WhatsApp, a UI do Agno e um agente realmente complexo. Amostras pequenas (6 a 16 tentativas).

## Comparação em resumo

| Critério | AI SDK | Agno |
|---|---|---|
| Chat no site | **Melhor**: `useChat`, partes de tool tipadas, controle total da interface (testado) | Sem UI no repositório; a UI do Agno não foi testada |
| Memória e contexto | Por sua conta (histórico no cliente, sem memória) | **Nativo**: sessão em banco + memória por `user_id` |
| Agente complexo | `ToolLoopAgent`; o resto você monta | Memória, conhecimento, times e workflows no pacote (só a memória foi testada) |
| Telegram | Polling: **sem URL pública**; bot em processo separado; mostra só a resposta | Webhook: **exige túnel**; mesmo servidor da API; mostra as tools chamadas |
| Outras plataformas | O Chat SDK lista mais (Teams, Discord, Google Chat…), só pela doc | WhatsApp e Slack nativos (não testados) |
| Voz | Experimental (`realtime`, `speech`, `transcription`); realtime não testado | Sem sessão realtime no núcleo; áudio por turnos |
| Código do chat básico | 189 linhas (TS/TSX, inclui a página) | 105 linhas (Python, só backend) |
| Segurança de borda | Sem porta aberta (polling) | Exige `OS_SECURITY_KEY` ao usar túnel |
| Linguagem | TypeScript | Python |

**Números medidos** (detalhes e ressalvas no [COMPARISON.md](COMPARISON.md)):

- **Lembrar um fato em sessão nova do mesmo usuário:** 16/16 com a memória do Agno em modo `agentic` (6/6 em modo `auto`), 0/16 sem ela, e o mesmo 0 com os modelos mais fortes. O histórico é por sessão; a memória é por `user_id`.
- **Voz em turnos** (transcrição + agente + fala): 15 a 19 s por turno, dominado pela transcrição (10 a 14 s). Serve para áudio, não para conversa ao vivo.
- **Custo da memória do Agno:** cerca de 2× em tempo (52 s contra 23 s em 10 tentativas).
- **Tool calling:** os dois acertaram as tools em 3 de 3 execuções; latência parecida (3 a 5 s), dominada pelo modelo.
- **Modelo:** o `gemini-2.5-flash` às vezes responde "não sei" mesmo com o fato no histórico, em qualquer canal; `claude-sonnet-4.5` e `gpt-4.1` acertaram 6/6 só com histórico.

Para ler a comparação completa: [`COMPARISON.md`](COMPARISON.md), ou a página `/docs` e a home `/` do app (`bash scripts/dev.sh`).

## Estrutura

```
.env.example              variáveis de ambiente (copie para .env)
COMPARISON.md             comparação completa, números e ressalvas
ai-sdk/                   app Next.js (TypeScript)
  app/                    páginas: / (home), /compare, /chat, /voice, /docs
  app/api/                chat, compare e voice (rotas de servidor)
  lib/                    modelo, tools, cliente do Agno
  bot.mts                 bot do Telegram (Chat SDK, polling)
agno/                     agente Python com AgentOS
  main.py                 agente + AgentOS (+ interface Telegram se houver token)
  tools.py                tools de clima e hora
shared/                   system prompt e roteiro de teste, usados pelos dois lados
scripts/                  dev.sh, smoke_fal.sh, telegram_webhook.sh, recall_eval.py
docs/superpowers/         spec e plano de implementação da POC
```

## Pré-requisitos

- Node 22 ou superior (testado com 24) e Python 3.13.
- Uma chave da [FAL](https://fal.ai), usada como roteador de modelos e para voz (transcrição e fala).
- Opcional, para o Telegram: dois bots criados no `@BotFather`.

## Configuração

```bash
cp .env.example .env
```

Preencha o `.env` (ele está no `.gitignore`; **nunca** o versione):

| Variável | Para quê |
|---|---|
| `FAL_KEY` | Chave da FAL. Obrigatória. |
| `FAL_BASE_URL`, `FAL_MODEL` | Endpoint compatível com OpenAI e modelo. Os padrões do `.env.example` funcionam. |
| `OS_SECURITY_KEY` | Protege a API do Agno (todas as rotas, menos o webhook do Telegram). Gere com `openssl rand -hex 24`. Obrigatória para `/compare` e `/voice`. |
| `TELEGRAM_BOT_TOKEN_AISDK`, `TELEGRAM_BOT_USERNAME_AISDK` | Bot do Telegram do lado AI SDK. |
| `TELEGRAM_BOT_TOKEN_AGNO`, `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Bot do Telegram do lado Agno e o segredo do webhook (`openssl rand -hex 24`). |
| `TELEGRAM_ALLOWED_USER_IDS` | Opcional. Restringe o bot do AI SDK ao seu id do Telegram. |

Valide a FAL antes de tudo:

```bash
bash scripts/smoke_fal.sh   # esperado: status 200, chunks em streaming, tool_calls: yes
```

Alternativa local com Ollama: `FAL_BASE_URL=http://localhost:11434/v1`, `FAL_MODEL=qwen2.5:7b`, `FAL_KEY=ollama`.

## Rodar tudo

```bash
bash scripts/dev.sh
```

Sobe o AI SDK em `:3000` e o Agno em `:7777`, instala as dependências na primeira execução e para os dois com `Ctrl+C`. O Agno roda com memória de usuário ligada (`AGNO_MEMORY=agentic`).

| Página | O que é |
|---|---|
| `http://localhost:3000/` | Home: conclusão, arquitetura (validada e ideal), diferenças e links |
| `/compare` | O mesmo prompt para os dois agentes, lado a lado (resposta, tools, tempo). "New session (same user)" mostra a diferença de memória |
| `/chat` | Chat com streaming e tools, só com o AI SDK |
| `/voice` | Voz e texto na mesma sessão do Agno (ainda não testada com microfone real) |
| `/docs` | O `COMPARISON.md` completo |

Para rodar só um lado:

```bash
cd ai-sdk && npm install && npm run dev            # http://localhost:3000
cd agno && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python main.py                           # http://localhost:7777
```

A API do Agno exige a chave: `curl -N -X POST localhost:7777/agents/chat-agent/runs -H "Authorization: Bearer $OS_SECURITY_KEY" -F "message=Clima em Lisboa?" -F stream=true`.

## Telegram

São dois bots, porque o Telegram só permite webhook **ou** polling por bot.

**AI SDK** (polling, não precisa de URL pública):

```bash
cd ai-sdk && npm run bot
```

**Agno** (só webhook, **precisa de URL pública HTTPS**): o Agno liga a interface do Telegram sozinho quando `TELEGRAM_BOT_TOKEN_AGNO` está no `.env`.

1. Suba o Agno (`bash scripts/dev.sh`).
2. Abra um túnel para a porta 7777 em **outro terminal** e deixe aberto, por exemplo com o [`cloudflared`](https://github.com/cloudflare/cloudflared): `cloudflared tunnel --url http://localhost:7777`. Ele imprime uma URL `https://….trycloudflare.com`. O `cloudflared` não faz parte deste repositório.
3. Registre o webhook (o Agno não faz isso sozinho): `bash scripts/telegram_webhook.sh https://….trycloudflare.com`.
4. Para encerrar: `Ctrl+C` no túnel e apague o webhook:
   ```bash
   bash -c 'set -a; source .env; set +a; curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_AGNO}/deleteWebhook"'
   ```

**Segurança com o túnel:** ele expõe a porta inteira do Agno. Por isso `OS_SECURITY_KEY` deve estar definida: sem ela, qualquer pessoa com a URL chama a API e gasta seus créditos. Nunca use `APP_ENV=development` no Agno, porque isso desliga a validação do segredo do webhook. O bot do Agno **não** tem filtro por usuário (a interface não oferece): enquanto o webhook estiver registrado, qualquer pessoa que achar o username do bot consegue usá-lo.

## Testes

```bash
cd ai-sdk && npm test                    # 11 testes: tools e cliente do Agno
cd ai-sdk && npx tsc --noEmit            # checagem de tipos
cd agno && .venv/bin/pytest -q           # 6 testes das tools
```

O roteiro manual, igual para os dois lados, está em `shared/test-script.md`.

## Experimentos

`scripts/recall_eval.py` mede a lembrança de um fato, na mesma sessão e em uma sessão nova do mesmo usuário. Rode com o Agno no ar:

```bash
agno/.venv/bin/python scripts/recall_eval.py <rótulo> [tentativas]
```

Variáveis para reiniciar o Agno com outra configuração (os padrões não mudam):

| Variável | Efeito |
|---|---|
| `AGNO_MEMORY=auto` ou `agentic` | Liga a memória de usuário (extração automática ou decidida pelo modelo via tool) |
| `AGENT_PROMPT_FILE=<arquivo>` | Usa outro system prompt (há um em `shared/system-prompt-neutral.txt`) |
| `FAL_MODEL=<modelo>` | Troca o modelo (ex.: `anthropic/claude-sonnet-4.5`, `openai/gpt-4.1`) |

Exemplo: `AGNO_MEMORY=agentic bash scripts/dev.sh`. Os resultados estão no `COMPARISON.md`.

## Observações

- O histórico do Agno fica em `agno/data/agent.db` (SQLite, ignorado pelo git). Apague a pasta `agno/data/` para zerar sessões e memórias.
- A UI hospedada do Agno (os.agno.com) e o Agent UI exigem conta e não foram testados.
- Design e plano de implementação: `docs/superpowers/specs/` e `docs/superpowers/plans/`.
