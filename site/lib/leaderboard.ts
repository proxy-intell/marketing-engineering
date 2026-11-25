// Public site: catalog + scores -> one HTML page. Pure, so it runs under `node --test`.
import { layout, NAV } from "./layout";
import type { Product, Scores, Setup } from "./types";

const OURS = ["proxy"];

const META = String.raw`<title>Marketing Engineering: marketing tools ranked by real usage</title><meta name="description" content="Marketing tools, skills and plugins ranked by what other marketers actually use. Ads, SEO and AEO, analytics, email, billing."><meta property="og:title" content="Marketing Engineering"><meta property="og:description" content="What other marketers are actually using. Turns out it's not what Twitter says…"><meta property="og:image" content="https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/assets/social-preview.png"><meta property="og:url" content="https://marketingengineering.dev/"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/assets/social-preview.png"><link rel="apple-touch-icon" href="https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/assets/icon-180.png"><link rel="alternate" type="text/markdown" href="/vote.md">`;

const body = (data: string, voters: number) => String.raw`<body><main>
<div class="wrap">
  ${NAV}

  <div class="hero">
    <div class="h-left">
      <h1>vote for the tools you actually&nbsp;use.</h1>
      <p class="lede">join <b>${voters}</b> marketers ranking tools by real use, not hype.</p>
    </div>
    <div class="votecard">
      <div class="vc-h">vote with your agent</div>
      <div class="works"><span class="ag" title="Claude"><svg viewBox="0 0 24 24" aria-label="Claude" role="img"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" fill="currentColor"/></svg></span><span class="ag" title="Cursor"><svg viewBox="0 0 24 24" aria-label="Cursor" role="img"><path d="M11.925 24l10.425-6-10.425-6L1.5 18l10.425 6z" fill="currentColor" opacity="0.55"/><path d="M22.35 18V6L11.925 0v12l10.425 6z" fill="currentColor" opacity="0.8"/><path d="M11.925 0L1.5 6v12l10.425-6V0z" fill="currentColor" opacity="1"/><path d="M22.35 6L11.925 24V12L22.35 6z" fill="currentColor" opacity="0.4"/><path d="M22.35 6l-10.425 6L1.5 6h20.85z" fill="currentColor" opacity="0.65"/></svg></span><span class="ag" title="ChatGPT and Codex"><svg viewBox="0 0 24 24" aria-label="ChatGPT and Codex" role="img"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="currentColor"/></svg></span><span class="ag more" title="any agent">+ any agent</span></div>
      <ol class="steps"><li><b>copy this</b></li></ol>
      <div class="vc-bar"><code id="cmd">check which marketing tools I have installed (MCP, CLI and skill names only) and give me a vote link - https://marketingengineering.dev/vote.md</code><button type="button" id="cp">copy vote</button></div>
      <ol class="steps" start="2">
        <li><span><b>paste it into your agent.</b> it only looks at tool names and sends nothing</span></li>
        <li><span><b>open the link it gives you, check the vote and send</b></span></li>
      </ol>
      <a href="#how" class="howlink">how votes count ↓</a>
    </div>
  </div>
</div>
<div class="band" aria-hidden="true"><div class="band-in" id="band"></div></div>

<div class="wrap sec" id="setups" hidden>
  <div class="sec-h"><h2>setups</h2></div>
  <p class="fine">a few tools that do one job together, built from votes automatically. copy one and your agent sets it up.</p>
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
    var cmd = 'set up "' + s.job + '" — https://marketingengineering.dev/setups/' + s.slug + ".md";
    return '<article class="scard"><h3>' + esc(s.job) + "</h3><ol>" + s.steps.map(function (t) {
      return '<li><a href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.name) + '</a> <span class="w">' + esc(t.why) + "</span>" + (t.ours ? '<span class="kd">made by us</span>' : "") + "</li>";
    }).join("") + '</ol><p class="fine">' + v + '</p><div class="code"><code>' + esc(cmd) + "</code><button type=\"button\">copy setup</button></div></article>";
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
      try { navigator.clipboard.writeText(t).then(function () { b.textContent = "copied"; setTimeout(function () { b.textContent = "copy setup"; }, 1400); }, sel); } catch (x) { sel(); }
      function sel() { var r = document.createRange(); r.selectNodeContents(b.previousElementSibling); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    });
  }

  document.getElementById("cp").addEventListener("click", function () {
    var t = document.getElementById("cmd").textContent, b = this;
    posthog.capture("vote_command_copied");
    try { navigator.clipboard.writeText(t).then(function () { b.textContent = "copied"; setTimeout(function () { b.textContent = "copy vote"; }, 1400); }, function () { sel(); }); } catch (e) { sel(); }
    function sel() { var r = document.createRange(); r.selectNodeContents(document.getElementById("cmd")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  });

  // Shape band (Config-style supergraphic): colour cells with a nested primitive. Decorative, built here to keep the HTML small.
  var C = [["#FF5A1F","#FFC53D"],["#2448FF","#BFDAF5"],["#1FA35B","#F5B5E1"],["#FFC53D","#2448FF"],["#F5B5E1","#3B38A3"],["#BFDAF5","#FF5A1F"],["#3B38A3","#FFC53D"],["#F3EFE3","#1FA35B"],["#FFC53D","#FF5A1F"]];
  var SH = ["s-circle","s-diamond","s-pill","s-ring","s-quarter","s-square","s-star","s-pillv","s-half"];
  var band = document.getElementById("band");
  for (var c = 0; c < 30; c++) {
    var el = document.createElement("div"), col = C[(c * 4) % C.length], sh = SH[(c * 5 + 2) % SH.length];
    el.className = "cell " + sh; el.style.setProperty("--bg", col[0]); el.style.setProperty("--fg", col[1]);
    el.innerHTML = "<i></i>" + (/ring|square|star/.test(sh) ? "<i></i>" : "");
    band.append(el);
  }
  // Every couple of seconds one cell turns and nudges its neighbour. Off with reduced motion.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setInterval(function () {
    var k = Math.floor(Math.random() * band.children.length);
    band.children[k].classList.toggle("on");
    setTimeout(function () { if (band.children[k + 1]) band.children[k + 1].classList.toggle("on"); }, 250);
  }, 2200);
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
  return layout(META, "", body(data, scores.voters));
}
