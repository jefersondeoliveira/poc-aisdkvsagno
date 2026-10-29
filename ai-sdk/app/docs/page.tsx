import { readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

export const metadata = { title: "Full comparison | AI SDK vs Agno POC" };

// Single source of truth: ../COMPARISON.md (a trusted file in this repository).
export default function Docs() {
  const md = readFileSync(path.join(process.cwd(), "../COMPARISON.md"), "utf8");
  const html = marked.parse(md, { async: false });
  return (
    <main className="wrap">
      <p className="muted">
        Documento completo (em inglês), gerado de <code>COMPARISON.md</code>. O resumo em português está na{" "}
        <a href="/">Home</a>.
      </p>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
