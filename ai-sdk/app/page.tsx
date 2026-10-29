import Link from "next/link";

const pages = [
  { href: "/compare", title: "Compare", text: "O mesmo prompt para os dois agentes, lado a lado. Teste a memória com “nova sessão”." },
  { href: "/chat", title: "Chat (AI SDK)", text: "Chat com streaming e tools, feito só com o AI SDK." },
  { href: "/voice", title: "Voz + texto", text: "Voz e texto na mesma sessão do Agno. Ainda não testada com microfone real." },
  { href: "/docs", title: "Comparação completa", text: "O documento técnico com todas as tabelas, números e ressalvas." },
];

const rows: [string, string, string][] = [
  ["Chat no site", "Melhor: useChat, partes tipadas de tool, controle total da interface (testado)", "Sem UI no repositório; a UI do Agno não foi testada"],
  ["Memória e contexto", "Por sua conta (histórico no cliente, sem memória)", "Nativa: sessão em banco + memória por user_id"],
  ["Agente complexo", "ToolLoopAgent; o resto você monta", "Memória, conhecimento, times e workflows no próprio pacote (só memória testada)"],
  ["Canais (Telegram)", "Polling: sem URL pública; bot em processo separado; mostra só a resposta", "Webhook: exige túnel; mesmo servidor da API; mostra as tools chamadas"],
  ["Plataformas", "Chat SDK lista mais (Teams, Discord, Google Chat…) — só pela doc", "WhatsApp, Slack e Telegram nativos (só Telegram testado)"],
  ["Voz", "Experimental (realtime, speech, transcription); realtime não testado", "Sem sessão realtime no núcleo; áudio por turnos"],
  ["Código do chat básico", "189 linhas (TS/TSX, inclui a página)", "105 linhas (Python, só backend)"],
  ["Linguagem", "TypeScript", "Python"],
];

const measured = [
  { n: "16/16 vs 0/16", t: "Lembrar um fato em sessão nova do mesmo usuário: Agno com memória vs sem memória (qualquer modelo)" },
  { n: "15 a 19 s", t: "Um turno de voz em etapas (transcrição 10–14 s, Agno ~1 s, fala ~4 s): serve para áudio, não para conversa ao vivo" },
  { n: "2×", t: "Custo de tempo da memória do Agno (52 s vs 23 s em 10 tentativas)" },
  { n: "0 vs 1", t: "URLs públicas necessárias para o Telegram em desenvolvimento: AI SDK vs Agno" },
];

const unproven = [
  "Voz em tempo real (realtime) com contexto compartilhado: só testei voz em turnos, com áudio sintético.",
  "Mesmo user_id entre canais diferentes (site, Telegram, WhatsApp): usei o mesmo id de propósito; não verifiquei como os canais do Agno mapeiam a pessoa.",
  "Slack e WhatsApp (nenhum dos dois), a UI do Agno (Agent UI) e um agente realmente complexo (vários fatos, conhecimento, times).",
  "Amostras pequenas (6 a 16 tentativas): são indicações, não taxas.",
];

function Diagram() {
  return (
    <svg className="diagram" viewBox="0 0 880 330" role="img" aria-label="Arquitetura sugerida: Agno como núcleo do agente, AI SDK na interface web e de voz">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="dg-head" />
        </marker>
      </defs>
      <rect className="dg-box" x="10" y="20" width="200" height="64" rx="10" />
      <text className="dg-text" x="110" y="48" textAnchor="middle">Site (chat)</text>
      <text className="dg-sub" x="110" y="68" textAnchor="middle">navegador</text>
      <rect className="dg-box" x="10" y="110" width="200" height="64" rx="10" />
      <text className="dg-text" x="110" y="138" textAnchor="middle">Voz</text>
      <text className="dg-sub" x="110" y="158" textAnchor="middle">turnos hoje, realtime depois</text>

      <rect className="dg-box-a" x="300" y="55" width="230" height="95" rx="10" />
      <text className="dg-text" x="415" y="88" textAnchor="middle">AI SDK (Next.js)</text>
      <text className="dg-sub" x="415" y="110" textAnchor="middle">interface web e voz</text>
      <text className="dg-sub" x="415" y="128" textAnchor="middle">chama o Agno por API</text>

      <rect className="dg-box-a" x="620" y="110" width="250" height="150" rx="10" />
      <text className="dg-text" x="745" y="143" textAnchor="middle">Agno (AgentOS)</text>
      <text className="dg-sub" x="745" y="165" textAnchor="middle">agente, tools, memória por user_id</text>
      <text className="dg-sub" x="745" y="183" textAnchor="middle">sessão persistente em banco</text>
      <text className="dg-sub" x="745" y="201" textAnchor="middle">interfaces: Telegram, WhatsApp, Slack</text>
      <text className="dg-sub" x="745" y="219" textAnchor="middle">API protegida por chave</text>

      <rect className="dg-box" x="620" y="285" width="250" height="38" rx="10" />
      <text className="dg-text" x="745" y="309" textAnchor="middle">Telegram · WhatsApp · Slack</text>

      <path className="dg-line" d="M210 52 L298 90" markerEnd="url(#ah)" />
      <path className="dg-line" d="M210 142 L298 120" markerEnd="url(#ah)" />
      <path className="dg-line" d="M530 105 L618 150" markerEnd="url(#ah)" />
      <path className="dg-line" d="M745 285 L745 262" markerEnd="url(#ah)" />
    </svg>
  );
}


function Box({ x, y, w, h, title, sub, dashed, accent }: { x: number; y: number; w: number; h: number; title: string; sub?: string; dashed?: boolean; accent?: boolean }) {
  return (
    <g>
      <rect className={`${accent ? "dg-box-a" : "dg-box"}${dashed ? " dg-dash" : ""}`} x={x} y={y} width={w} height={h} rx="10" />
      <text className="dg-text" x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 5)} textAnchor="middle">{title}</text>
      {sub && <text className="dg-sub" x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle">{sub}</text>}
    </g>
  );
}

function IdealDiagram() {
  return (
    <svg className="diagram" viewBox="0 0 960 430" role="img" aria-label="Arquitetura ideal: canais, camada de identidade, AI SDK na borda, Agno como núcleo, dados e serviços de modelo e voz">
      <defs>
        <marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="dg-head" />
        </marker>
      </defs>
      <text className="dg-sub" x="10" y="14">CANAIS</text>
      <text className="dg-sub" x="255" y="14">BORDA E IDENTIDADE</text>
      <text className="dg-sub" x="545" y="14">NÚCLEO DO AGENTE</text>
      <text className="dg-sub" x="815" y="14">DADOS E SERVIÇOS</text>

      <Box x={10} y={24} w={190} h={46} title="Site (chat)" />
      <Box x={10} y={80} w={190} h={46} title="Voz em tempo real" dashed />
      <Box x={10} y={150} w={190} h={46} title="Telegram" />
      <Box x={10} y={206} w={190} h={46} title="WhatsApp" dashed />
      <Box x={10} y={262} w={190} h={46} title="Slack" dashed />

      <Box x={255} y={24} w={230} h={102} title="AI SDK (Next.js)" sub="UI web e voz · chama o Agno por API" accent />
      <Box x={255} y={178} w={230} h={96} title="Identidade" sub="pessoa → um user_id estável" dashed />

      <rect className="dg-box-a" x="545" y="24" width="235" height="284" rx="10" />
      <text className="dg-text" x="662" y="52" textAnchor="middle">Agno (AgentOS)</text>
      <text className="dg-sub" x="662" y="82" textAnchor="middle">agentes e times</text>
      <text className="dg-sub" x="662" y="104" textAnchor="middle">tools</text>
      <text className="dg-sub" x="662" y="126" textAnchor="middle">memória por user_id</text>
      <text className="dg-sub" x="662" y="148" textAnchor="middle">sessão persistente</text>
      <text className="dg-sub" x="662" y="170" textAnchor="middle">conhecimento (RAG)</text>
      <text className="dg-sub" x="662" y="192" textAnchor="middle">interfaces de canal</text>
      <text className="dg-sub" x="662" y="214" textAnchor="middle">API protegida</text>

      <Box x={815} y={24} w={140} h={46} title="Postgres" sub="sessões e memória" dashed />
      <Box x={815} y={80} w={140} h={46} title="Vetores" sub="conhecimento (RAG)" dashed />
      <Box x={815} y={136} w={140} h={46} title="Gateway de modelos" sub="FAL / OpenRouter" />
      <Box x={815} y={192} w={140} h={46} title="STT e TTS" sub="FAL (turnos)" />
      <Box x={815} y={248} w={140} h={46} title="Provedor realtime" sub="voz ao vivo" dashed />

      <path className="dg-line" d="M200 47 L253 62" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M200 103 L253 92" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M485 75 L543 75" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M200 173 L253 215" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M200 229 L253 226" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M200 285 L253 240" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M485 226 L543 226" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M780 47 L813 47" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M780 103 L813 103" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M780 159 L813 159" markerEnd="url(#ah2)" />
      <path className="dg-line" d="M780 215 L813 215" markerEnd="url(#ah2)" />
      <path className="dg-line dg-dash" d="M780 271 L813 271" markerEnd="url(#ah2)" />

      <rect className="dg-box dg-dash" x="10" y="334" width="945" height="40" rx="10" />
      <text className="dg-text" x="482" y="359" textAnchor="middle">Transversal: autenticação (hoje: chave) → JWT/SSO · observabilidade e custo por usuário · limites de uso</text>

      <rect className="dg-box" x="10" y="392" width="34" height="18" rx="4" />
      <text className="dg-sub" x="52" y="405">validado na POC</text>
      <rect className="dg-box dg-dash" x="190" y="392" width="34" height="18" rx="4" />
      <text className="dg-sub" x="232" y="405">proposto, não testado</text>
    </svg>
  );
}

export default function Home() {
  return (
    <main className="wrap">
      <h1>Vercel AI SDK vs Agno</h1>
      <p className="lead">
        POC para decidir como construir um agente complexo, em vários canais (site, Telegram, WhatsApp, Slack) e com
        texto e voz compartilhando contexto. O mesmo cenário foi implementado nas duas ferramentas e medido.
      </p>

      <section className="card verdict" style={{ marginTop: 24 }}>
        <strong>Veredito para o seu caso: usar os dois em conjunto, cada um no seu papel.</strong>
        <p>
          <strong>Agno</strong> como núcleo do agente (memória por <code>user_id</code>, sessão persistente, tools e canais
          no mesmo servidor). <strong>AI SDK</strong> na ponta web e de voz, falando com o Agno por API. Isso já funciona em
          miniatura: as páginas <Link href="/compare">Compare</Link> e <Link href="/voice">Voz + texto</Link> chamam o Agno
          a partir do AI SDK.
        </p>
        <p className="muted">
          Quando <em>não</em> usar os dois: chat simples só no site, ou o AI SDK sozinho já basta; backend de agentes em
          Python sem interface própria, ou o Agno sozinho basta. Juntar os dois só compensa pela combinação de agente
          complexo + vários canais + voz.
        </p>
      </section>

      <h2>Arquitetura da POC (o que foi validado)</h2>
      <div className="card"><Diagram /></div>

      <h2>Arquitetura ideal (alvo)</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Linha cheia: foi testado na POC. Tracejado: proposta, ainda não testada (identidade única entre canais, voz em
        tempo real, Postgres no lugar do SQLite, RAG, WhatsApp e Slack, autenticação real).
      </p>
      <div className="card"><IdealDiagram /></div>

      <h2>Quem faz melhor o quê</h2>
      <div className="card tablewrap">
        <table>
          <thead><tr><th>Critério</th><th>AI SDK</th><th>Agno</th></tr></thead>
          <tbody>
            {rows.map(([k, a, b]) => (
              <tr key={k}><th scope="row">{k}</th><td>{a}</td><td>{b}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>O que foi medido</h2>
      <div className="grid">
        {measured.map((m) => (
          <div key={m.n} className="card">
            <div className="stat">{m.n}</div>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>{m.t}</p>
          </div>
        ))}
      </div>

      <h2>O que ainda não foi provado</h2>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {unproven.map((u) => <li key={u} className="warn" style={{ margin: "6px 0" }}><span style={{ color: "var(--fg)" }}>{u}</span></li>)}
        </ul>
      </div>

      <h2>Páginas para testar</h2>
      <div className="grid-2">
        {pages.map((p) => (
          <Link key={p.href} href={p.href} className="card cardlink">
            <strong>{p.title}</strong>
            <br />
            <span>{p.text}</span>
          </Link>
        ))}
      </div>

      <h2>Como rodar</h2>
      <div className="card">
        <p style={{ margin: 0 }}>
          <code>cp .env.example .env</code> (preencha <code>FAL_KEY</code> e <code>OS_SECURITY_KEY</code>), depois{" "}
          <code>bash scripts/dev.sh</code>. Detalhes no <code>README.md</code>; telegram e experimentos nos scripts em{" "}
          <code>scripts/</code>.
        </p>
      </div>
    </main>
  );
}
