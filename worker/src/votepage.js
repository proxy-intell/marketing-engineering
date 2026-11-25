// /v: the vote page for agents that can't send a POST (Claude Desktop chat, claude.ai, ChatGPT).
// The agent links here with ?t=slug:usage,... and the person checks it, adds an email if they want, and sends.
import { PAGE } from "./leaderboard.js";
import { WEIGHTS, MAX_TOOLS } from "./votes.js";

// "posthog:daily,resend:weekly" -> [{slug, usage}], keeping only listed slugs and known usage values.
export function parseVoteLink(t, slugs) {
  const known = new Set(slugs);
  const out = [];
  const seen = new Set();
  for (const part of String(t || "").split(",")) {
    const [slug, usage] = part.trim().split(":");
    if (!known.has(slug) || !Object.prototype.hasOwnProperty.call(WEIGHTS, usage) || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, usage });
    if (out.length >= MAX_TOOLS) break;
  }
  return out;
}

const head = PAGE.slice(0, PAGE.indexOf("<title>"));
const style = PAGE.slice(PAGE.indexOf("<link rel=\"icon\""), PAGE.indexOf("</style>") + 8);
// PostHog snippet, same as the homepage, so the vote page shows up in the funnel.
const analytics = PAGE.slice(PAGE.indexOf("</style>") + 8, PAGE.indexOf("</head>"));
// Same header as the homepage: brand + GitHub link.
const navStart = PAGE.indexOf("<div class=\"nav mono\">");
const linksEnd = PAGE.indexOf("</div>", PAGE.indexOf("<div class=\"links\">", navStart)) + 6;
const nav = PAGE.slice(navStart, PAGE.indexOf("</div>", linksEnd) + 6);

export function renderVotePage(products) {
  const data = JSON.stringify(products.map((p) => ({ slug: p.slug, name: p.name, cat: p.category, x: p.maker_x || "" }))).replace(/</g, "\\u003c");
  return `${head}<title>Your vote · Marketing Engineering</title><meta name="robots" content="noindex">${style}${analytics}
<style>
.vp { max-width: 760px; padding-block: 8px 64px }
.vp h1 { font: 850 clamp(2.4rem, 7vw, 4.2rem)/.9 var(--display); font-variation-settings: "wdth" 76; letter-spacing: -.012em; margin: 28px 0 10px }
.vp .sub { margin: 0 0 22px; font-size: 1.02rem }
.vlist { border-top: 2px solid var(--ink) }
.vrow { display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--rule) }
.vrow b { display: block; font: 800 1.02rem/1.2 var(--display); font-variation-settings: "wdth" 88 }
.vp .nav { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 12px }
.vrow small { display: block; margin-top: 3px; line-height: 1.3; font: 500 .66rem/1.3 var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--mute) }
.vrow select { width: 100%; -webkit-appearance: none; appearance: none; border: 2px solid var(--ink); border-radius: 0; background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23181818' stroke-width='2' stroke-linecap='square'/%3E%3C/svg%3E") no-repeat right 14px center / 12px 8px; color: var(--mute); font: 800 .95rem var(--display); font-variation-settings: "wdth" 85; padding: 10px 40px 10px 14px; cursor: pointer }
.vrow.on select { color: var(--ink) }
.vmore { margin: 14px 0 0; border: 2px solid var(--ink); background: transparent; font: 700 .72rem var(--mono); text-transform: uppercase; letter-spacing: .05em; padding: 8px 12px; cursor: pointer }
.vemail { margin: 0 0 26px; max-width: 520px }
.vemail .field { margin: 0 0 10px }
.elab { display: block; margin-bottom: 6px; font: 700 .72rem var(--mono); text-transform: uppercase; letter-spacing: .05em }
.elab .req { color: var(--orange) }
.vemail .field.bad { border-color: var(--orange) }
.vfoot { margin-top: 26px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px }
.vemail input { font-size: 16px }
.vdone { margin-top: 6px; max-width: 620px }
.vdone p { margin: 0 0 20px; font-size: 1.05rem }
.vctas { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px }
.vctas a, .vctas button { text-decoration: none; display: inline-flex; align-items: center; gap: 8px }
.vsec { border: 2px solid var(--ink); background: transparent; color: var(--ink); font: 800 1rem var(--display); font-variation-settings: "wdth" 85; padding: 12px 18px; cursor: pointer }
.vrank { font: 700 .72rem var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--ink) }
.vemail label.ck { display: flex; gap: 8px; align-items: center; font: 500 .78rem var(--mono); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 16px }
.vgo { border: 0; background: var(--orange); color: var(--ink); font: 800 1rem var(--display); font-variation-settings: "wdth" 85; padding: 14px 22px; cursor: pointer }
.vgo:disabled { opacity: .5; cursor: default }
.vnote { display: block; font: 500 .72rem var(--mono); text-transform: uppercase; letter-spacing: .04em }
@media (max-width: 600px) { .vrow { grid-template-columns: minmax(0, 1fr) 128px } }
.vp [hidden] { display: none !important }
</style></head><body><main><div class="wrap vp">
  ${nav}
  <h1 id="h">your vote</h1>
  <p class="sub" id="lede">your agent filled this in. change anything, then send.</p>
  <form class="vemail" id="send" onsubmit="return false">
    <label class="elab" for="em">your email <span class="req" aria-hidden="true">*</span></label>
    <div class="field"><input type="email" id="em" placeholder="you@company.com" autocomplete="email" required aria-required="true"></div>
    <label class="ck"><input type="checkbox" id="drop" checked> send me the friday drop</label>
  </form>
  <div class="vlist" id="list"></div>
  <button type="button" class="vmore" id="more" hidden>show all tools</button>
  <div class="vfoot"><button type="button" class="vgo" id="go">send vote</button><span class="vnote" id="note"></span></div>
  <div class="vdone" id="done" hidden>
    <p id="doneMsg"></p>
    <div class="vctas">
      <a class="vgo" href="https://github.com/proxy-intell/marketing-engineering" target="_blank" rel="noopener"><svg class="star" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>star the repo</a>
      <a class="vsec" id="shareX" target="_blank" rel="noopener">share on X</a>
    </div>
    <a class="vrank" href="/">see the ranking →</a>
  </div>
</div></main>
<script type="application/json" id="data">${data}</script>
<script>
(function () {
  var parseVoteLink = ${parseVoteLink.toString()};
  var WEIGHTS = ${JSON.stringify(WEIGHTS)}, MAX_TOOLS = ${MAX_TOOLS};
  var P = JSON.parse(document.getElementById("data").textContent);
  var q = new URLSearchParams(location.search);
  var picked = parseVoteLink(q.get("t"), P.map(function (p) { return p.slug; }));
  var agent = (q.get("a") || "other").slice(0, 20);
  var pre = {}; picked.forEach(function (x) { pre[x.slug] = x.usage; });
  if (!picked.length) { document.getElementById("h").textContent = "vote by hand"; document.getElementById("lede").textContent = "pick the tools you use and how often. no agent needed."; }
  var order = picked.map(function (x) { return P.filter(function (p) { return p.slug === x.slug; })[0]; })
    .concat(P.filter(function (p) { return !pre[p.slug]; }).sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); }));
  var list = document.getElementById("list"), more = document.getElementById("more");
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  list.innerHTML = order.map(function (p) {
    var u = pre[p.slug] || "";
    var opts = [["", "not used"], ["daily", "daily"], ["weekly", "weekly"], ["monthly", "monthly"], ["installed", "installed only"]]
      .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === u ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
    return '<div class="vrow' + (u ? " on" : "") + '"' + (picked.length && !u ? " hidden" : "") + '><div><b>' + esc(p.name) + "</b><small>" + esc(p.cat) + '</small></div><select data-slug="' + esc(p.slug) + '" aria-label="How often you use ' + esc(p.name) + '">' + opts + "</select></div>";
  }).join("");
  var rest = P.length - picked.length, open = false;
  if (picked.length && rest > 0) { more.hidden = false; more.textContent = "show " + rest + " more tools"; }
  more.addEventListener("click", function () {
    open = !open;
    [].forEach.call(list.children, function (r) { if (!r.classList.contains("on") && !r.querySelector("select").value) r.hidden = !open; });
    more.textContent = open ? "hide other tools" : "show " + rest + " more tools";
  });
  list.addEventListener("change", function (e) { if (e.target.tagName === "SELECT") e.target.closest(".vrow").classList.toggle("on", !!e.target.value); });
  function installId() {
    var k = "me-install-id", v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10); try { localStorage.setItem(k, v); } catch (e) {} }
    return v;
  }
  var note = document.getElementById("note"), go = document.getElementById("go");
  var byslug = {}; P.forEach(function (p) { byslug[p.slug] = p; });
  var OPENERS = ["my agent just ratted out my marketing stack:", "asked my agent what i actually use. it did not hold back:", "my marketing stack, as confessed by my AI:", "turns out my agent has been taking notes:", "no one asked, but my agent snitched anyway:"];
  // random opener + top 3 tools (most used first, tagged on X where we know the handle) + where to vote
  function shareText(tools) {
    var top = tools.slice().sort(function (a, b) { return WEIGHTS[b.usage] - WEIGHTS[a.usage]; }).slice(0, 3).map(function (t) { var p = byslug[t.slug]; return p.x ? "@" + p.x : p.name; });
    var list = top.length > 1 ? top.slice(0, -1).join(", ") + " and " + top[top.length - 1] : top[0];
    return OPENERS[Math.floor(Math.random() * OPENERS.length)] + " " + list + ". what's yours? marketingengineering.dev";
  }


  function submitVote() {
    var tools = [].map.call(list.querySelectorAll("select"), function (s) { return { slug: s.getAttribute("data-slug"), usage: s.value }; }).filter(function (t) { return WEIGHTS[t.usage]; }).slice(0, MAX_TOOLS);
    if (!tools.length) { note.textContent = "pick at least one tool you use"; return; }
    var body = { v: 1, install_id: installId(), agent: agent, tools: tools };
    var emEl = document.getElementById("em"), em = emEl.value.trim();
    if (!em || !emEl.checkValidity()) { emEl.parentNode.classList.add("bad"); note.textContent = "add your email to send your vote"; emEl.focus(); return; }
    emEl.parentNode.classList.remove("bad");
    body.email = em; body.weekly_drop = document.getElementById("drop").checked;
    go.disabled = true; note.textContent = "sending...";
    fetch("/v1/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok) {
          document.getElementById("send").hidden = true; list.hidden = true; more.hidden = true; document.querySelector(".vfoot").hidden = true;
          document.getElementById("doneMsg").textContent = x.j.counted.tools + " tools counted" + (x.j.subscribed ? ", and you're on the friday drop" : "") + ". a star or a share helps the ranking grow.";
          document.getElementById("h").textContent = "thanks, your vote is counted"; document.getElementById("lede").hidden = true;
          document.getElementById("shareX").href = "https://x.com/intent/post?text=" + encodeURIComponent(shareText(tools));
          document.getElementById("done").hidden = false; window.scrollTo(0, 0);
        }
        else { note.textContent = x.j.error || "that didn't work, try again"; go.disabled = false; }
      })
      .catch(function () { note.textContent = "that didn't work, try again"; go.disabled = false; });
  }
  go.addEventListener("click", submitVote);
  document.getElementById("send").addEventListener("submit", submitVote);
})();
</script></body></html>`;
}
