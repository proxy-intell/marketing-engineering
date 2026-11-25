// Public site: catalog + scores -> one HTML page. Pure, so it runs under `node --test`.
import { layout, NAV } from "./layout";
import type { Product, Scores, Setup } from "./types";

const OURS = ["proxy"];

const META = String.raw`<title>Marketing Engineering: marketing tools ranked by real usage</title><meta name="description" content="Marketing tools, skills and plugins ranked by what other marketers actually use. Ads, SEO and AEO, analytics, email, billing."><meta property="og:title" content="Marketing Engineering"><meta property="og:description" content="What other marketers are actually using. Turns out it's not what Twitter says…"><meta property="og:image" content="https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/assets/social-preview.png"><meta property="og:url" content="https://marketingengineering.dev/"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/assets/social-preview.png"><link rel="apple-touch-icon" href="https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/assets/icon-180.png"><link rel="alternate" type="text/markdown" href="/vote.md">`;

const body = (data: string) => String.raw`<body><main>
<div class="wrap">
  ${NAV}

  <div class="hero">
    <div class="comp" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="510" height="340" viewBox="0 0 600 400" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><g transform="translate(0 0)"><rect width="100" height="100" fill="#F5B5E1"/><rect x="100" width="100" height="100" fill="#2448FF"/><rect y="100" width="100" height="100" fill="#1FA35B"/><rect x="100" y="100" width="100" height="100" fill="#FFC53D"/><path d="M100 0 L0 0 A100 100 0 0 0 100 100 Z" fill="#FF5A1F"/><path d="M200 100 L100 100 A100 100 0 0 1 200 0 Z" fill="#FFC53D"/><path d="M100 200 L200 200 A100 100 0 0 0 100 100 Z" fill="#F5B5E1"/><path d="M0 100 L100 100 A100 100 0 0 1 0 200 Z" fill="#2448FF"/></g><g transform="translate(200 0)"><rect width="200" height="200" fill="#BFDAF5"/><path d="M14 100 A86 86 0 0 1 186 100 Z" fill="#2448FF"/><path d="M14 100 A86 86 0 0 0 186 100 Z" fill="#FF5A1F"/><circle cx="100" cy="100" r="30" fill="#FFC53D"/></g><g transform="translate(400 0)"><rect width="200" height="200" fill="#1FA35B"/><rect x="28" y="28" width="144" height="144" fill="#FFC53D"/><rect x="58" y="58" width="84" height="84" fill="#FF5A1F"/><rect x="82" y="82" width="36" height="36" fill="#F5B5E1"/></g><g transform="translate(0 200)"><rect x="0" y="0" width="100" height="100" fill="#F5B5E1"/><path d="M0 0 L100 0 A100 100 0 0 1 0 100 Z" fill="#FF5A1F"/><rect x="100" y="0" width="100" height="100" fill="#2448FF"/><path d="M200 0 L100 0 A100 100 0 0 0 200 100 Z" fill="#FFC53D"/><rect x="200" y="0" width="100" height="100" fill="#1FA35B"/><path d="M300 100 L200 100 A100 100 0 0 1 300 0 Z" fill="#BFDAF5"/><rect x="300" y="0" width="100" height="100" fill="#FFC53D"/><path d="M300 100 L400 100 A100 100 0 0 0 300 0 Z" fill="#2448FF"/><rect x="0" y="100" width="100" height="100" fill="#BFDAF5"/><path d="M0 100 L100 100 A100 100 0 0 1 0 200 Z" fill="#1FA35B"/><rect x="100" y="100" width="100" height="100" fill="#FF5A1F"/><path d="M200 100 L100 100 A100 100 0 0 0 200 200 Z" fill="#F5B5E1"/><rect x="200" y="100" width="100" height="100" fill="#FFC53D"/><path d="M300 200 L200 200 A100 100 0 0 1 300 100 Z" fill="#3B38A3"/><rect x="300" y="100" width="100" height="100" fill="#F5B5E1"/><path d="M300 200 L400 200 A100 100 0 0 0 300 100 Z" fill="#2448FF"/></g><g transform="translate(400 200)"><rect width="200" height="200" fill="#F5B5E1"/><polygon points="200,0 200,200 0,200" fill="#3B38A3"/><circle cx="100" cy="100" r="44" fill="#FFC53D"/></g></svg></div>
    <div class="h-left">
      <h1>marketing engineering</h1>
      <p class="lede">what other marketers are actually using. turns out it's not what x/twitter says… <span class="seelinks"><a class="fine seerank" href="#rank">see the rankings ↓</a></span></p>
      <div class="join">
        <form class="field" id="drop" onsubmit="return false"><input type="email" id="em" placeholder="you@company.com" aria-label="Email"><button type="submit" id="join">join</button></form>
        <span class="fine" id="dropNote">new tools every friday</span>
      </div>
    </div>
    <div class="getit">
      <div class="agentbox">
        <div class="lbl">give this to your agent <span class="agchips"><span class="ag">Claude</span><span class="ag">Cursor</span><span class="ag">Codex</span><span class="ag">ChatGPT</span><span class="ag">any agent</span></span></div>
        <div class="bar"><code id="cmd">vote on marketing engineering - https://marketingengineering.dev/vote.md</code><button type="button" id="cp">Copy</button></div>
      </div>
      <span class="fine agentnote">it reads your setup, shows you the vote, and waits for a yes</span>
    </div>
  </div>
</div>

<div class="wrap sec" id="setups" hidden>
  <div class="sec-h"><h2>setups</h2></div>
  <p class="fine">a setup is a few tools people use together for one job. the more voters who use all of them, the higher it ranks</p>
  <div class="sgrid" id="sgrid"></div>
</div>

<div class="wrap sec" id="rank">
  <div class="sec-h"><h2>daily rankings</h2></div>
  <div class="tools">
    <input type="search" id="q" placeholder="search tools" aria-label="Search tools">
    <div class="dd" id="dd"><button type="button" id="ddb" aria-haspopup="listbox" aria-expanded="false"><span id="ddt">All categories</span><i aria-hidden="true"></i></button><ul id="ddl" role="listbox" aria-label="Category" hidden></ul></div>
    <span class="count mono" id="count"></span>
  </div>
  <div class="tw"><table class="rt">
    <thead><tr>
      <th class="n">#</th>
      <th data-k="name" aria-sort="none"><button type="button">Tool</button></th>
      <th data-k="cat" aria-sort="none" class="c-cat"><button type="button">Category</button></th>
      <th class="c-desc">What it does</th>
      <th class="c-bar">vs top</th>
      <th data-k="setups" aria-sort="none" class="num c-set"><button type="button">Setups</button></th>
      <th data-k="pts" aria-sort="descending" class="num"><button type="button">Pts</button></th>
      <th data-k="voters" aria-sort="none" class="num"><button type="button">Voters</button></th>
    </tr></thead>
    <tbody id="board"></tbody>
  </table></div>
</div>

<div class="bleed block" id="how">
  <div class="inner wrap">
    <h2>how it counts.</h2>
    <div class="nums"><div><svg xmlns="http://www.w3.org/2000/svg" class="mt" width="56" height="56" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="cp"><rect width="100%" height="100%"/></clipPath></defs><g clip-path="url(#cp)"><rect width="100" height="100" fill="#F5B5E1"/><rect x="100" width="100" height="100" fill="#2448FF"/><rect y="100" width="100" height="100" fill="#1FA35B"/><rect x="100" y="100" width="100" height="100" fill="#FFC53D"/><path d="M100 0 L0 0 A100 100 0 0 0 100 100 Z" fill="#FF5A1F"/><path d="M200 100 L100 100 A100 100 0 0 1 200 0 Z" fill="#FFC53D"/><path d="M100 200 L200 200 A100 100 0 0 0 100 100 Z" fill="#F5B5E1"/><path d="M0 100 L100 100 A100 100 0 0 1 0 200 Z" fill="#2448FF"/></g></svg><strong>3</strong><span>Daily</span><em>every day</em></div><div><svg xmlns="http://www.w3.org/2000/svg" class="mt" width="56" height="56" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="cp"><rect width="100%" height="100%"/></clipPath></defs><g clip-path="url(#cp)"><rect width="200" height="200" fill="#1FA35B"/><rect x="28" y="28" width="144" height="144" fill="#FFC53D"/><rect x="58" y="58" width="84" height="84" fill="#FF5A1F"/><rect x="82" y="82" width="36" height="36" fill="#F5B5E1"/></g></svg><strong>2</strong><span>Weekly</span><em>once a week</em></div><div><svg xmlns="http://www.w3.org/2000/svg" class="mt" width="56" height="56" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="cp"><rect width="100%" height="100%"/></clipPath></defs><g clip-path="url(#cp)"><rect width="200" height="200" fill="#F5B5E1"/><polygon points="200,0 200,200 0,200" fill="#3B38A3"/><circle cx="100" cy="100" r="44" fill="#FFC53D"/></g></svg><strong>1</strong><span>Monthly</span><em>once a month</em></div><div><svg xmlns="http://www.w3.org/2000/svg" class="mt" width="56" height="56" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="cp"><rect width="100%" height="100%"/></clipPath></defs><g clip-path="url(#cp)"><rect width="200" height="200" fill="#2448FF"/><rect x="24" y="40" width="112" height="36" rx="18" fill="#FFC53D"/><rect x="52" y="82" width="112" height="36" rx="18" fill="#F5B5E1"/><rect x="80" y="124" width="96" height="36" rx="18" fill="#1FA35B"/></g></svg><strong>0.5</strong><span>Installed</span><em>never opened</em></div></div>
  </div>
</div>

<footer class="site mono"><span class="brand"><i class="icslot"><svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#BFDAF5"/><rect x="10" y="10" width="20" height="20" rx="5.5" fill="#FFC53D"/><circle cx="44" cy="20" r="10" fill="#F5B5E1"/><polygon points="31.0,44.0 25.5,53.5 14.5,53.5 9.0,44.0 14.5,34.5 25.5,34.5" fill="#1FA35B"/><rect x="36.8" y="36.8" width="14.4" height="14.4" rx="2.4" fill="#FF5A1F" transform="rotate(45 44 44)"/></svg></i>Marketing Engineering</span><a class="ghl" href="https://github.com/proxy-intell/marketing-engineering"><svg class="gh" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>GitHub</a><a href="https://marketingengineering.dev/vote.md">vote.md</a><span>CC0 · Proxy Intelligence Inc.</span></footer>

</main>
<script type="application/json" id="data">${data}</script>
<script>
(function () {
  var D = JSON.parse(document.getElementById("data").textContent);
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var cats = []; D.rows.forEach(function (r) { if (cats.indexOf(r.cat) < 0) cats.push(r.cat); });
  cats.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
  var qEl = document.getElementById("q"), countEl = document.getElementById("count"), catVal = "";
  var ddb = document.getElementById("ddb"), ddl = document.getElementById("ddl"), ddt = document.getElementById("ddt"), hl = -1;
  var opts = [["", "All categories"]].concat(cats.map(function (c) { return [c, c]; }));
  ddl.innerHTML = opts.map(function (o, i) { return '<li role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' + esc(o[1]) + "</li>"; }).join("");
  var lis = [].slice.call(ddl.children);
  function ddOpen(on) { ddl.hidden = !on; ddb.setAttribute("aria-expanded", on ? "true" : "false"); hl = -1; lis.forEach(function (l) { l.classList.remove("hl"); }); }
  function ddPick(i) { catVal = opts[i][0]; ddt.textContent = opts[i][1]; lis.forEach(function (l, j) { l.setAttribute("aria-selected", j === i ? "true" : "false"); }); ddOpen(false); render(); }
  function ddMove(d) { hl = Math.max(0, Math.min(lis.length - 1, hl + d)); lis.forEach(function (l, j) { l.classList.toggle("hl", j === hl); }); lis[hl].scrollIntoView({ block: "nearest" }); }
  ddb.addEventListener("click", function () { ddOpen(ddl.hidden); });
  ddl.addEventListener("click", function (e) { var li = e.target.closest("li"); if (li) ddPick(+li.getAttribute("data-i")); });
  document.addEventListener("click", function (e) { if (!document.getElementById("dd").contains(e.target)) ddOpen(false); });
  document.getElementById("dd").addEventListener("keydown", function (e) {
    if (e.key === "Escape") { ddOpen(false); ddb.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (ddl.hidden) ddOpen(true); ddMove(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!ddl.hidden) ddMove(-1); }
    else if (e.key === "Enter" && !ddl.hidden && hl >= 0) { e.preventDefault(); ddPick(hl); }
  });
  var sortK = "pts", sortDir = -1;
  function val(r, k) { return k === "pts" ? r.score : k === "voters" ? r.voters : k === "setups" ? r.setups : String(r[k]).toLowerCase(); }
  function render() {
    var q = qEl.value.trim().toLowerCase(), c = catVal;
    var rows = D.rows.filter(function (r) { return (!c || r.cat === c) && (!q || (r.name + " " + r.cat + " " + r.desc).toLowerCase().indexOf(q) >= 0); });
    rows.sort(function (a, b) { var x = val(a, sortK), y = val(b, sortK); var d = x < y ? -1 : x > y ? 1 : 0; return (d * sortDir) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
    var max = Math.max.apply(null, D.rows.map(function (r) { return r.score; }).concat([1]));
    countEl.textContent = rows.length + " of " + D.rows.length + " tools";
    var board = document.getElementById("board");
    board.innerHTML = rows.length ? rows.map(function (r, i) {
      return '<tr><td class="rk">' + String(i + 1).padStart(2, "0") + '</td><td class="nm"><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a>' + '<span class="msub">' + esc(r.cat) + '</span></td>' +
        '<td class="cat">' + esc(r.cat) + '</td><td class="desc">' + esc(r.desc) + '</td>' +
        '<td class="bar"><div class="meter"><i style="width:' + (r.score / max) * 100 + '%"></i></div></td>' +
        '<td class="num set">' + (r.setups ? '<a href="#setups">' + r.setups + '</a>' : "") + '</td><td class="num">' + r.score + '</td><td class="num">' + r.voters + "</td></tr>";
    }).join("") : '<tr class="empty-row"><td colspan="8">no tools match</td></tr>';
  }
  qEl.addEventListener("input", render);
  [].forEach.call(document.querySelectorAll("table.rt th[data-k]"), function (th) {
    th.querySelector("button").addEventListener("click", function () {
      var k = th.getAttribute("data-k");
      sortDir = sortK === k ? -sortDir : (k === "pts" || k === "voters" || k === "setups" ? -1 : 1); sortK = k;
      [].forEach.call(document.querySelectorAll("table.rt th[data-k]"), function (x) { x.setAttribute("aria-sort", x === th ? (sortDir > 0 ? "ascending" : "descending") : "none"); });
      render();
    });
  });
  render();

  var sgrid = document.getElementById("sgrid");
  function scard(s) {
    var v = s.voters ? s.voters + (s.voters === 1 ? " voter has" : " voters have") + " all of this" : "nobody has all of this yet";
    var cmd = 'set up "' + s.job + '" - https://marketingengineering.dev/setups/' + s.slug + ".md";
    return '<article class="scard"><h3>' + esc(s.job) + "</h3><ol>" + s.steps.map(function (t) {
      return '<li><a href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.name) + '</a> <span class="w">' + esc(t.why) + "</span>" + (t.ours ? '<span class="kd">made by us</span>' : "") + "</li>";
    }).join("") + '</ol><p class="fine">' + v + '</p><div class="code"><code>' + esc(cmd) + "</code><button type=\"button\">Copy</button></div></article>";
  }
  if (D.setups.length) {
    document.getElementById("setups").hidden = false;
    sgrid.innerHTML = D.setups.slice(0, 6).map(scard).join("");
    if (D.setups.length > 6) {
      var more = document.createElement("button"); more.type = "button"; more.className = "smore"; more.textContent = "show all " + D.setups.length + " setups";
      more.addEventListener("click", function () { sgrid.innerHTML = D.setups.map(scard).join(""); more.remove(); });
      sgrid.parentNode.appendChild(more);
    }
    sgrid.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var t = b.previousElementSibling.textContent;
      posthog.capture("setup_command_copied", { setup: b.closest("article").querySelector("h3").textContent });
      try { navigator.clipboard.writeText(t).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1400); }, sel); } catch (x) { sel(); }
      function sel() { var r = document.createRange(); r.selectNodeContents(b.previousElementSibling); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    });
  }

  document.getElementById("cp").addEventListener("click", function () {
    var t = document.getElementById("cmd").textContent, b = this;
    posthog.capture("vote_command_copied");
    try { navigator.clipboard.writeText(t).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1400); }, function () { sel(); }); } catch (e) { sel(); }
    function sel() { var r = document.createRange(); r.selectNodeContents(document.getElementById("cmd")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  });
  var note = document.getElementById("dropNote"), join = document.getElementById("join");
  document.getElementById("drop").addEventListener("submit", function () {
    var em = document.getElementById("em").value.trim();
    if (!em) { note.textContent = "add an email first"; return; }
    join.disabled = true; note.textContent = "joining...";
    fetch("/v1/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: em }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { posthog.identify(em.toLowerCase(), { email: em.toLowerCase() }); } note.textContent = x.ok ? "you're in. first drop lands friday." : (x.j.error || "that didn't work, try again"); })
      .catch(function () { note.textContent = "that didn't work, try again"; })
      .then(function () { join.disabled = false; });
  });
})();
</script>
</body></html>`;

export function renderLeaderboard(products: Product[], scores: Pick<Scores, "voters" | "tools"> & Partial<Pick<Scores, "setups">>, setups: Setup[] = []): string {
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));
  const count: Record<string, number> = {};
  for (const st of setups) for (const t of st.steps) count[t.tool] = (count[t.tool] ?? 0) + 1;
  const rows = products.map((p) => {
    const s = scores.tools[p.slug] ?? { score: 0, voters: 0 };
    return { slug: p.slug, name: p.name, url: p.url, cat: p.category, desc: p.description, kind: p.kind ?? "tool", score: s.score, voters: s.voters, setups: count[p.slug] ?? 0 };
  }).sort((a, b) => b.score - a.score || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const sets = setups.map((st) => ({
    slug: st.slug, job: st.job, voters: scores.setups?.[st.slug]?.voters ?? 0,
    steps: st.steps.map((t) => ({ slug: t.tool, name: by[t.tool]?.name ?? t.tool, url: by[t.tool]?.url, why: t.why, ours: OURS.includes(t.tool) })),
  })).sort((a, b) => b.voters - a.voters || a.job.localeCompare(b.job));
  const data = JSON.stringify({ voters: scores.voters, rows, setups: sets }).replace(/</g, "\\u003c");
  return layout(META, "", body(data));
}
