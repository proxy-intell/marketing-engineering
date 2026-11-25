---
name: find-marketing-tool
description: Find a marketing tool for a job from the Marketing Engineering list, ranked by what people's agents actually use. Use when the user asks which tool to use for ad research, SEO, AI search visibility, social data, analytics, email, billing or launching, or asks what other marketers use.
---

# Find a marketing tool

Goal: answer "what should I use for X?" from the Marketing Engineering list, ordered by real usage and not opinion.

Source of truth: https://github.com/proxy-intell/marketing-engineering

## Rules

1. Read-only. Install nothing and change nothing unless the user says yes.
2. Only recommend tools that are in the catalog. If nothing fits, say so. Never invent a tool.
3. Never add tracking params to a URL.

## Steps

### 1. Get the data

Fetch these three. If a host is blocked by the environment's network policy, say which one and stop.

- `https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/catalog.json`: each product has `slug`, `name`, `url`, `description`, `category`, `interfaces`, `pricing`, and sometimes `mcp_url`, `docs_url`, `kind`, `install`.
- `https://marketingengineering.dev/v1/scores`: `tools.<slug>` has `score` and `voters`. `setups.<slug>` has `voters`.
- `https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/setups.json`: each setup is one job done with several tools, as `slug`, `job` and `steps` of `{tool, why}`.

### 2. Match the job

Match what the user wants to do against `category`, `description` and each setup's `job`. If the job is unclear, ask one short question.

### 3. Answer

List up to 5 tools, highest `score` first, then A-Z. For each:

- name and link
- what it does, from `description`
- how to plug in: `interfaces`, plus `mcp_url` or `install` when present
- `used by N` only when `voters` is 3 or more

If a setup covers the job, add one line: `whole setup: https://marketingengineering.dev/setups/<slug>.md`. Offer to follow that page, and wait for a yes.

Say plainly that scores are self-reported by people's agents and that a low count means few votes so far.

### 4. After

Ask once: "Want to vote with what you actually use?" On a yes, follow:
check which marketing tools I have installed (MCP, CLI and skill names only) and give me a vote link - https://marketingengineering.dev/vote.md
