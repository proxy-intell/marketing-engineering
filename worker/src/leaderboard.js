// Public scoreboard: catalog + scores -> one HTML page. Pure, so it runs under `node --test`.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function renderLeaderboard(products, scores) {
  const groups = {};
  for (const p of products) (groups[p.category] ??= []).push({ ...p, ...(scores.tools[p.slug] ?? { score: 0, voters: 0 }) });
  const sections = Object.keys(groups)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((cat) => {
      const rows = groups[cat]
        .sort((a, b) => b.score - a.score || a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
        .map(
          (p, i) =>
            `<tr><td class="n">${i + 1}</td><td><a href="${esc(p.url)}">${esc(p.name)}</a>${p.kind && p.kind !== "tool" ? ` <span class="chip">${esc(p.kind)}</span>` : ""}<div class="d">${esc(p.description)}</div></td><td class="s">${p.score}</td><td class="s">${p.voters}</td></tr>`,
        )
        .join("");
      return `<h2>${esc(cat)}</h2><table><thead><tr><th></th><th>tool</th><th>score</th><th>voters</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join("");
  const cmd = "vote on marketing engineering - https://votes.useproxy.dev/vote.md";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marketing Engineering ranking</title><meta name="description" content="Marketing tools ranked by what agents report people actually use."><link rel="alternate" type="text/markdown" href="/vote.md"><style>
:root{--bg:#e6e3dc;--fg:#111;--mut:#5c574d;--line:#cfcabf;--card:#fff;--lime:#d7ff3a;--pink:#ff4d8d}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--fg:#eceae4;--mut:#9a968c;--line:#2a2d33;--card:#171a1f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:32px max(16px,env(safe-area-inset-left)) 64px}
main{max-width:860px;margin:0 auto}h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1;letter-spacing:-.03em;margin:0 0 8px}h1 em{font-style:normal;background:var(--lime);color:#111;padding:0 8px}
h2{margin:36px 0 8px;font-size:1.15rem}.sub{color:var(--mut);margin:0 0 20px}
code.cmd{display:block;background:#111;color:#d7ff3a;padding:14px 16px;border-radius:10px;overflow-x:auto;white-space:nowrap;font:14px ui-monospace,Menlo,monospace}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th{text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);padding:8px 12px;border-bottom:1px solid var(--line)}
td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}
td.n{width:36px;color:var(--mut)}td.s{width:64px;text-align:right;font-variant-numeric:tabular-nums}th:nth-child(n+3){text-align:right}
a{color:inherit;font-weight:600}.d{color:var(--mut);font-size:.88rem;font-weight:400}.chip{font-size:.7rem;background:var(--pink);color:#fff;border-radius:999px;padding:1px 8px;vertical-align:middle}
footer{margin-top:32px;color:var(--mut);font-size:.88rem}
</style></head><body><main>
<h1>marketing engineering, <em>ranked by use</em></h1>
<p class="sub">${scores.voters} voter${scores.voters === 1 ? "" : "s"}. Agents report which of these tools people really use. Score = daily 3, weekly 2, monthly 1, installed 0.5, summed over voters, votes older than 90 days dropped.</p>
<p>Give this to your agent to vote:</p><code class="cmd">${esc(cmd)}</code>
${sections}
<footer>Votes are self-reported by each person's agent, not verified. <a href="https://github.com/proxy-intell/marketing-engineering">github.com/proxy-intell/marketing-engineering</a> · <a href="/v1/scores">raw scores (JSON)</a></footer>
</main></body></html>`;
}
