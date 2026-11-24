<h1 align="center">Marketing Engineering</h1>

<p align="center">
  <img src="assets/header.png" alt="Your agent votes, you just scroll. Claude scans your setup, votes for the marketing tools you really use, and asks if you want the Friday drop." width="100%">
</p>

<p align="center">
  <em>one thumb doomscrolling. one hand clauding. campaign shipped somehow</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ranked%20by-real%20usage-d7ff3a?style=flat&labelColor=111111" alt="Ranked by real usage">
  <img src="https://img.shields.io/badge/meetings-0-ff4d8d?style=flat&labelColor=111111" alt="Meetings: 0">
  <a href="llms.txt"><img src="https://img.shields.io/badge/llms.txt-ready-d7ff3a?style=flat&labelColor=111111" alt="llms.txt ready"></a>
</p>

<p align="center">
  <a href="#vote-with-your-usage"><b>Vote with your usage</b></a> ·
  <a href="https://votes.useproxy.dev"><b>See the ranking</b></a> ·
  <a href="https://github.com/proxy-intell/marketing-engineering/releases"><b>Friday drops</b></a> ·
  <a href="#add-a-tool-by-hand"><b>Add a tool by hand</b></a>
</p>

> tools for running marketing like software: ads, SEO and AEO, organic social, analytics, email, billing and the AI agents that drive them

marketers opened a terminal. engineers got asked to "make it go viral". same person now. this is their toolbox

## vote with your usage

give this to your agent (Claude Code, Cursor, Codex, any agent that can fetch a URL):

```
vote on marketing engineering - https://votes.useproxy.dev/vote.md
```

it checks which of these tools you really use, shows you exactly what it will send, and waits for a yes. it asks once if you want the friday email (give one or say no, the vote counts either way). tools more people use climb. tools nobody uses sink. tools we don't list yet get proposed once 3 agents use them

only tool names and usage ratings leave your machine. never code, paths, keys or prompts. [how voting works](docs/how-voting-works.md)

want it permanent? `npx skills add proxy-intell/marketing-engineering` installs it as a skill for Claude Code, Cursor, Codex, Copilot and other agents. [more ways](docs/install.md)

every entry says what it does and how you plug in: MCP server, API, CLI, SDK, plugin, skill or web app. skills and plugins for coding agents are listed too, with an install line. agents can skip the prose and read [`llms.txt`](llms.txt) or [`catalog.json`](catalog.json), remote MCP URLs included

new tools ship every friday as a [release](https://github.com/proxy-intell/marketing-engineering/releases) and an email. watch → custom → releases, or give your agent an email when it asks

<!-- BEGIN CATALOG -->

## Contents

- [AI search visibility (AEO)](#ai-search-visibility-aeo)
- [Attribution & product analytics](#attribution--product-analytics)
- [Billing, credits & paywalls](#billing-credits--paywalls)
- [Bing & AI-search indexing](#bing--ai-search-indexing)
- [Coding agents](#coding-agents)
- [Competitor & market research](#competitor--market-research)
- [Creative strategy](#creative-strategy)
- [Email sending](#email-sending)
- [Google SEO](#google-seo)
- [Launching](#launching)
- [Screenshots & browser automation](#screenshots--browser-automation)
- [TikTok, Instagram & YouTube data](#tiktok-instagram--youtube-data)

## AI search visibility (AEO)

- [Perplexity Sonar API](https://docs.perplexity.ai) - API for answers grounded in live web search, returned with source citations.

## Attribution & product analytics

- [PostHog](https://posthog.com) - Open-source product analytics: events, funnels, session replay, feature flags and experiments. Self-hostable or cloud.

## Billing, credits & paywalls

- [Autumn](https://useautumn.com) - Billing layer on Stripe. Plans, credits and usage limits are defined in a config file; it tracks usage and keeps payments and webhooks in sync.
- [Stripe](https://stripe.com) - Payments API with Checkout, subscriptions, invoicing and a customer billing portal.

## Bing & AI-search indexing

- [IndexNow](https://www.indexnow.org) - Open protocol that pings participating search engines (Bing, Yandex, Naver, Seznam) when a URL is published or changes.
- [Bing Webmaster Tools](https://www.bing.com/webmasters) - Search queries, index coverage and backlink reports for your site in Bing, plus URL submission.

## Coding agents

- [Claude Code](https://claude.com/claude-code) - Anthropic's coding agent for the terminal, IDEs and web. Reads and edits a codebase, runs commands and connects to MCP servers.

## Competitor & market research

- [Exa](https://exa.ai) - Web search API built for AI agents. Semantic search over the web, with page contents and structured results returned.

## Creative strategy

- [Gemini API](https://ai.google.dev) - Google's model API. Accepts text, image, audio and video input, so it can transcribe and describe video ads.
- [Proxy](https://useproxy.dev) - MCP server for the Meta, Google, LinkedIn and TikTok (EU) ad libraries, with video and image analysis of ads.

## Email sending

- [Resend](https://resend.com) - Email API for transactional and marketing email. React templates, contacts, broadcasts and webhooks.

## Google SEO

- [Google Search Console](https://search.google.com/search-console) - Reports on your site's clicks, impressions, queries and indexing status in Google Search, with URL inspection and indexing requests.
- [Semrush](https://www.semrush.com) - Keyword research, rank tracking, backlink data and competitor traffic estimates.

## Launching

- [Product Hunt](https://www.producthunt.com) - Site where new tech products launch daily and rank by upvotes. Also a searchable directory of past launches.

## Screenshots & browser automation

- [Playwright](https://playwright.dev) - Browser automation library for Chromium, Firefox and WebKit. Drives pages, takes screenshots, runs end-to-end tests. Node, Python, Java and .NET.

## TikTok, Instagram & YouTube data

- [ScrapeCreators](https://scrapecreators.com) - Scraping API for public data from TikTok, Instagram, YouTube, Facebook, LinkedIn and X, including ad libraries.

<!-- END CATALOG -->

## add a tool by hand

1. **ask your agent to add one.** paste this into any agent with GitHub access

   ```
   Add <tool URL> to github.com/proxy-intell/marketing-engineering. Follow AGENTS.md and open a PR.
   ```

2. **open a PR yourself.** edit `catalog.json`, run `python scripts/build.py`. details in [CONTRIBUTING.md](CONTRIBUTING.md)

listed? put the badge in your README: [![Featured on Marketing Engineering](https://votes.useproxy.dev/badge.svg)](https://github.com/proxy-intell/marketing-engineering) ([snippet](CONTRIBUTING.md#listed-add-the-badge))
