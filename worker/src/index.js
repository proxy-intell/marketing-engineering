import { validateVote, score, ranksFor, matchSetups, EMAIL } from "./votes.js";
import { validSetups, renderSetupMd } from "./setups.js";
import { BADGE_SVG } from "./badge.js";
import { renderLeaderboard } from "./leaderboard.js";

const RAW = "https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main";
const SKILL_DESCRIPTION = "Vote on the Marketing Engineering tool list using what the user actually uses. Use when the user asks to vote, rank, submit or add marketing tools, skills or plugins to proxy-intell/marketing-engineering, or pastes the vote.md link.";

const MAX_BODY = 20_000;
const MAX_VOTES_PER_IP_PER_DAY = 10;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

const sha256 = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    // marketingengineering.dev is canonical. Anything else (www, other TLDs) redirects to it.
    if (!["marketingengineering.dev", "localhost"].includes(url.hostname) && !url.hostname.endsWith(".workers.dev")) {
      return Response.redirect(`https://marketingengineering.dev${pathname}${url.search}`, 301);
    }

    if (request.method === "GET" && pathname === "/v1/scores") {
      const { results } = await env.DB.prepare("SELECT updated_at, payload FROM votes").all();
      const rows = results.map((r) => ({ updated_at: r.updated_at, payload: JSON.parse(r.payload) }));
      return json(score(rows, Date.now(), await loadSetups()), 200, { "cache-control": "public, max-age=300" });
    }

    if (request.method === "POST" && pathname === "/v1/vote") {
      const text = await request.text();
      if (text.length > MAX_BODY) return json({ error: "body too large" }, 413);
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "body must be JSON" }, 400);
      }
      const { vote, error } = validateVote(body);
      if (error) return json({ error }, 400);

      // 10 votes per IP per day. Only a salted hash of the IP is stored.
      const day = new Date().toISOString().slice(0, 10);
      const ipHash = await sha256(`${env.IP_SALT ?? ""}${request.headers.get("cf-connecting-ip") ?? "unknown"}`);
      const hit = await env.DB.prepare(
        "INSERT INTO rate (ip_hash, day, n) VALUES (?, ?, 1) ON CONFLICT(ip_hash, day) DO UPDATE SET n = n + 1 RETURNING n",
      ).bind(ipHash, day).first();
      if (hit.n > MAX_VOTES_PER_IP_PER_DAY) return json({ error: "too many votes from this address today" }, 429);

      const existed = await env.DB.prepare("SELECT 1 FROM votes WHERE install_id = ?").bind(vote.install_id).first();
      const emailHash = vote.email ? await sha256(vote.email) : null;
      const now = Date.now();
      const statements = [];
      // One vote per person: a vote with a known email replaces that person's votes from other installs.
      if (emailHash) statements.push(env.DB.prepare("DELETE FROM votes WHERE email_hash = ? AND install_id != ?").bind(emailHash, vote.install_id));
      statements.push(
        env.DB.prepare(
          "INSERT INTO votes (install_id, email_hash, agent, updated_at, payload) VALUES (?, ?, ?, ?, ?) " +
            "ON CONFLICT(install_id) DO UPDATE SET email_hash = excluded.email_hash, agent = excluded.agent, updated_at = excluded.updated_at, payload = excluded.payload",
        ).bind(vote.install_id, emailHash, vote.agent, now, JSON.stringify({ tools: vote.tools, proposals: vote.proposals })),
      );
      if (vote.weekly_drop) {
        statements.push(
          env.DB.prepare("INSERT INTO subscribers (email_hash, email, created_at) VALUES (?, ?, ?) ON CONFLICT(email_hash) DO NOTHING").bind(emailHash, vote.email, now),
        );
      }
      await env.DB.batch(statements);

      if (vote.weekly_drop && env.RESEND_API_KEY) {
        ctx.waitUntil(addToResend(env, vote.email));
      }

      // The vote is stored by now. A setups lookup failure only empties the list.
      let setups = [];
      try {
        const res = await fetch(`${RAW}/catalog.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
        if (res.ok) {
          const { products } = await res.json();
          const names = Object.fromEntries(products.map((p) => [p.slug, p.name]));
          setups = matchSetups(vote.tools, await loadSetups(new Set(Object.keys(names)))).slice(0, 3)
            .map((m) => ({ ...m, missing: m.missing.map((s) => names[s] ?? s) }));
        }
      } catch (e) { console.error("setups lookup failed", e); }

      // Where the voter now stands, so the agent can say "you're voter #N, PostHog is #2".
      const { results } = await env.DB.prepare("SELECT updated_at, payload FROM votes").all();
      const scores = score(results.map((r) => ({ updated_at: r.updated_at, payload: JSON.parse(r.payload) })));
      return json({
        ok: true,
        counted: { tools: vote.tools.length, proposals: vote.proposals.length },
        subscribed: vote.weekly_drop,
        new: !existed,
        voters: scores.voters,
        ranks: ranksFor(scores.tools, vote.tools.map((t) => t.slug)),
        setups,
      });
    }

    // Friday drop sign-up from the site's email box. Shares the per-IP daily limit with votes.
    if (request.method === "POST" && pathname === "/v1/subscribe") {
      const text = await request.text();
      if (text.length > 1000) return json({ error: "body too large" }, 413);
      let email;
      try {
        email = JSON.parse(text).email;
      } catch {
        return json({ error: "body must be JSON" }, 400);
      }
      if (typeof email !== "string" || email.length > 254 || !EMAIL.test(email.trim())) return json({ error: "that email doesn't look right" }, 400);
      email = email.trim().toLowerCase();
      const day = new Date().toISOString().slice(0, 10);
      const ipHash = await sha256(`${env.IP_SALT ?? ""}${request.headers.get("cf-connecting-ip") ?? "unknown"}`);
      const hit = await env.DB.prepare(
        "INSERT INTO rate (ip_hash, day, n) VALUES (?, ?, 1) ON CONFLICT(ip_hash, day) DO UPDATE SET n = n + 1 RETURNING n",
      ).bind(ipHash, day).first();
      if (hit.n > MAX_VOTES_PER_IP_PER_DAY) return json({ error: "too many tries from this address today" }, 429);
      await env.DB.prepare("INSERT INTO subscribers (email_hash, email, created_at) VALUES (?, ?, ?) ON CONFLICT(email_hash) DO NOTHING")
        .bind(await sha256(email), email, Date.now()).run();
      if (env.RESEND_API_KEY) ctx.waitUntil(addToResend(env, email));
      return json({ ok: true });
    }

    // Short, stable URL for agents: "vote on marketing engineering - https://marketingengineering.dev/vote.md"
    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/vote.md") return fetchVoteMd();

    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/badge.svg") {
      return new Response(BADGE_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
    }

    // Agent Skills discovery, same shape other skill catalogs publish at /.well-known/skills/
    if (request.method === "GET" && pathname === "/.well-known/skills/index.json") {
      return json({ skills: [{ name: "vote-marketing-engineering", description: SKILL_DESCRIPTION, files: ["SKILL.md"] }] }, 200, { "cache-control": "public, max-age=3600" });
    }
    if (request.method === "GET" && pathname === "/.well-known/skills/vote-marketing-engineering/SKILL.md") {
      return fetchVoteMd();
    }

    // One setup as agent-readable markdown
    const setupMatch = (request.method === "GET" || request.method === "HEAD") && pathname.match(/^\/setups\/([a-z0-9-]{1,40})\.md$/);
    if (setupMatch) {
      let products;
      try {
        const catalogRes = await fetch(`${RAW}/catalog.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
        if (!catalogRes.ok) return json({ error: "catalog unavailable" }, 502);
        ({ products } = await catalogRes.json());
      } catch {
        return json({ error: "catalog unavailable" }, 502);
      }
      const setup = (await loadSetups(new Set(products.map((p) => p.slug)))).find((s) => s.slug === setupMatch[1]);
      if (setup) return new Response(renderSetupMd(setup, products), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
    }

    // Public scoreboard
    if (request.method === "GET" && (pathname === "/" || pathname === "/leaderboard")) {
      const [catalogRes, { results }] = await Promise.all([
        fetch(`${RAW}/catalog.json`, { cf: { cacheTtl: 300, cacheEverything: true } }),
        env.DB.prepare("SELECT updated_at, payload FROM votes").all(),
      ]);
      if (!catalogRes.ok) return json({ error: "catalog unavailable" }, 502);
      const { products } = await catalogRes.json();
      const setups = await loadSetups(new Set(products.map((p) => p.slug)));
      const scores = score(results.map((r) => ({ updated_at: r.updated_at, payload: JSON.parse(r.payload) })), Date.now(), setups);
      return new Response(renderLeaderboard(products, scores, setups), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
    }

    return json({ error: "not found" }, 404);
  },
};

// Never throws: a missing or broken setups.json means no setups, not a broken Worker.
async function loadSetups(slugs = null) {
  try {
    const res = await fetch(`${RAW}/setups.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
    return res.ok ? validSetups(await res.json(), slugs) : [];
  } catch {
    return [];
  }
}

// Best effort. The subscribers table is the source of truth if Resend is down.
async function addToResend(env, email) {
  const body = { email, unsubscribed: false };
  if (env.RESEND_SEGMENT_ID) body.segments = [{ id: env.RESEND_SEGMENT_ID }];
  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("resend contact create failed", res.status, await res.text());
}

async function fetchVoteMd() {
  const res = await fetch(`${RAW}/vote.md`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) return new Response(JSON.stringify({ error: "vote.md unavailable, read it on GitHub" }), { status: 502, headers: { "content-type": "application/json" } });
  return new Response(await res.text(), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
}
