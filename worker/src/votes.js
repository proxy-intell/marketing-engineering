// Pure vote logic: validation and scoring. No I/O, so it runs under `node --test`.

export const WEIGHTS = { daily: 3, weekly: 2, monthly: 1, installed: 0.5 };
export const WINDOW_DAYS = 90;
export const MAX_TOOLS = 40;
export const MAX_PROPOSALS = 5;

const KINDS = ["tool", "skill", "plugin", "data"];
const AGENTS = ["claude-code", "cursor", "codex", "chatgpt", "gemini", "other"];
export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export function validateVote(body) {
  if (!body || typeof body !== "object" || body.v !== 1) return { error: "v must be 1" };
  if (typeof body.install_id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(body.install_id)) return { error: "install_id must be 8-64 chars of A-Z a-z 0-9 -" };
  const agent = AGENTS.includes(body.agent) ? body.agent : "other";

  let email = null;
  if (body.email != null) {
    if (typeof body.email !== "string" || body.email.length > 254 || !EMAIL.test(body.email)) return { error: "email is not valid" };
    email = body.email.trim().toLowerCase();
  }

  const tools = body.tools ?? [];
  if (!Array.isArray(tools) || tools.length > MAX_TOOLS) return { error: `tools must be an array of at most ${MAX_TOOLS}` };
  const seen = new Set();
  for (const t of tools) {
    if (!t || typeof t.slug !== "string" || !/^[a-z0-9-]{1,60}$/.test(t.slug)) return { error: "tool slug must match ^[a-z0-9-]{1,60}$" };
    if (!(t.usage in WEIGHTS)) return { error: "usage must be daily, weekly, monthly or installed" };
    if (seen.has(t.slug)) return { error: `duplicate tool ${t.slug}` };
    seen.add(t.slug);
  }

  const proposals = body.proposals ?? [];
  if (!Array.isArray(proposals) || proposals.length > MAX_PROPOSALS) return { error: `proposals must be an array of at most ${MAX_PROPOSALS}` };
  for (const p of proposals) {
    if (!p || typeof p.name !== "string" || p.name.length < 1 || p.name.length > 60) return { error: "proposal name must be 1-60 chars" };
    if (typeof p.url !== "string" || p.url.length > 200 || !/^https:\/\/[^\s]+$/.test(p.url)) return { error: "proposal url must be https" };
    if (typeof p.description !== "string" || p.description.length < 1 || p.description.length > 160) return { error: "proposal description must be 1-160 chars" };
    if (typeof p.category !== "string" || p.category.length < 1 || p.category.length > 40) return { error: "proposal category must be 1-40 chars" };
    if (!(p.usage in WEIGHTS)) return { error: "proposal usage must be daily, weekly, monthly or installed" };
    if (p.kind != null && !KINDS.includes(p.kind)) return { error: "proposal kind must be tool, skill, plugin or data" };
    if (p.install != null && (typeof p.install !== "string" || p.install.length > 200 || /[\r\n]/.test(p.install))) return { error: "proposal install must be one line, 200 chars max" };
  }

  if (!tools.length && !proposals.length) return { error: "send at least one tool or proposal" };

  return {
    vote: {
      install_id: body.install_id,
      agent,
      email,
      weekly_drop: body.weekly_drop === true && email !== null,
      tools: tools.map(({ slug, usage }) => ({ slug, usage })),
      proposals: proposals.map(({ name, url, description, category, usage, kind, install }) => ({ name, url, description, category, usage, ...(kind && kind !== "tool" ? { kind } : {}), ...(install ? { install } : {}) })),
    },
  };
}

// "https://www.Foo.com/bar/" -> "foo.com/bar"
export function proposalKey(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// rows: [{ updated_at (ms), payload (parsed vote) }]
export function score(rows, now = Date.now(), setups = []) {
  const cutoff = now - WINDOW_DAYS * 86400000;
  const tools = {};
  const proposals = {};
  const setupVoters = Object.fromEntries(setups.map((s) => [s.slug, { voters: 0 }]));
  let voters = 0;
  for (const { updated_at, payload } of rows) {
    if (updated_at < cutoff) continue;
    voters++;
    const have = new Set(payload.tools.map((t) => t.slug));
    for (const s of setups) if (s.steps.every((st) => have.has(st.tool))) setupVoters[s.slug].voters++;
    for (const t of payload.tools) {
      const e = (tools[t.slug] ??= { score: 0, voters: 0 });
      e.score += WEIGHTS[t.usage];
      e.voters++;
    }
    for (const p of payload.proposals) {
      const k = proposalKey(p.url);
      const e = (proposals[k] ??= { name: p.name, url: p.url, description: p.description, category: p.category, ...(p.kind ? { kind: p.kind } : {}), ...(p.install ? { install: p.install } : {}), score: 0, voters: 0 });
      e.score += WEIGHTS[p.usage];
      e.voters++;
    }
  }
  return {
    updated: new Date(now).toISOString(),
    voters,
    tools,
    setups: setupVoters,
    proposals: Object.values(proposals).sort((a, b) => b.voters - a.voters || b.score - a.score),
  };
}

// tools: [{slug, usage}]; setups: [{slug, job, steps: [{tool}]}]. Setups the voter touches, closest first.
export function matchSetups(tools, setups) {
  const have = new Set(tools.map((t) => t.slug));
  return setups
    .map(({ slug, job, steps }) => {
      const missing = steps.map((st) => st.tool).filter((t) => !have.has(t));
      return { slug, job, have: steps.length - missing.length, of: steps.length, missing };
    })
    .filter((m) => m.have >= 1)
    .sort((a, b) => a.missing.length - b.missing.length || a.slug.localeCompare(b.slug));
}
