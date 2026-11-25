// Setups: validate setups.json and render the per-setup agent page. Pure, no I/O.
import type { Product, Setup } from "./types";

// Never throws. slugs: Set of catalog slugs, or null to skip the catalog check.
export function validSetups(json: any, slugs: Set<string> | null = null): Setup[] {
  const list = Array.isArray(json?.setups) ? json.setups : [];
  const out: Setup[] = [];
  for (const s of list) {
    if (!s || typeof s.slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(s.slug) || typeof s.job !== "string" || !Array.isArray(s.steps)) continue;
    const steps = s.steps
      .filter((st: any) => st && typeof st.tool === "string" && typeof st.why === "string" && (!slugs || slugs.has(st.tool)))
      .map(({ tool, why }: Setup["steps"][number]) => ({ tool, why }));
    if (steps.length >= 2) out.push({ slug: s.slug, job: s.job, steps });
  }
  return out;
}

export function renderSetupMd(setup: Setup, products: Partial<Product>[]): string {
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));
  const tools = setup.steps
    .map(({ tool, why }, i) => {
      const p = by[tool] ?? { name: tool };
      return [
        `${i + 1}. **${p.name}** (${p.url}): ${why}`,
        `   ${p.description}`,
        ...(p.mcp_url ? [`   MCP: ${p.mcp_url}`] : []),
        ...(p.docs_url ? [`   Docs: ${p.docs_url}`] : []),
      ].join("\n");
    })
    .join("\n\n");
  return `---
name: setup-${setup.slug}
description: Set up the "${setup.job}" stack from Marketing Engineering for this user. Use when the user pastes this link or asks to set up ${setup.job}.
---

# Set up: ${setup.job}

Goal: get this user ready to ${setup.job} with the tools below. Source: https://marketingengineering.dev/#setups

## Tools, in order

${tools}

## Rules

1. Check what the user already has first (MCP servers configured, CLIs on PATH, dependencies). Skip any tool that is already set up.
2. Show the list of what you will install or connect, and wait for a yes.
3. Never ask the user to paste an API key into the chat. Point them to the tool's own sign-in or settings page.
4. Prefer a tool's MCP server when it has one. Otherwise follow its docs.
5. Install nothing that is not on this list.
6. When done, say which tools are ready and which still need the user.

## After

Ask once: "Want to vote with what you actually use?" On a yes, follow:
vote on marketing engineering - https://marketingengineering.dev/vote.md
`;
}
