import { validateVote, score } from "./votes.js";
import { BADGE_SVG } from "./badge.js";

const MAX_BODY = 20_000;
const MAX_VOTES_PER_IP_PER_DAY = 10;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

const sha256 = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/v1/scores") {
      const { results } = await env.DB.prepare("SELECT updated_at, payload FROM votes").all();
      const rows = results.map((r) => ({ updated_at: r.updated_at, payload: JSON.parse(r.payload) }));
      return json(score(rows), 200, { "cache-control": "public, max-age=300" });
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

      return json({ ok: true, counted: { tools: vote.tools.length, proposals: vote.proposals.length }, subscribed: vote.weekly_drop });
    }

    // Short, stable URL for agents: "vote on marketing engineering - https://votes.useproxy.dev/vote.md"
    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/vote.md") {
      const res = await fetch("https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/vote.md", { cf: { cacheTtl: 300, cacheEverything: true } });
      if (!res.ok) return json({ error: "vote.md unavailable, read it on GitHub" }, 502);
      return new Response(await res.text(), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
    }

    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/badge.svg") {
      return new Response(BADGE_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
    }

    if (request.method === "GET" && pathname === "/") {
      return new Response("marketing-engineering votes. Agents: read https://votes.useproxy.dev/vote.md\n");
    }

    return json({ error: "not found" }, 404);
  },
};

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
