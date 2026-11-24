<h1 align="center">Marketing Engineering</h1>

<p align="center">
  <em>One thumb doomscrolling. One hand Clauding. Campaign shipped somehow.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/screen%20time-research-111111?style=flat-square" alt="Screen time: research">
  <img src="https://img.shields.io/badge/meetings-0-111111?style=flat-square" alt="Meetings: 0">
  <img src="https://img.shields.io/badge/for-humans%20%2B%20agents-111111?style=flat-square" alt="For humans and agents">
  <a href="llms.txt"><img src="https://img.shields.io/badge/llms.txt-ready-111111?style=flat-square" alt="llms.txt"></a>
  <a href="catalog.json"><img src="https://img.shields.io/badge/catalog-JSON-111111?style=flat-square" alt="JSON catalog"></a>
</p>

<p align="center">
  <a href="https://github.com/proxy-intell/marketing-engineering/issues/new?template=suggest-product.yml"><b>➕ Suggest a tool</b></a> ·
  <a href="#ask-your-agent"><b>🤖 Ask your agent to add one</b></a> ·
  <a href="https://github.com/proxy-intell/marketing-engineering/releases"><b>📦 Friday drops</b></a>
</p>

> Tools for running marketing like software: ads, SEO and AEO, organic social, analytics, email, billing, and the agents that drive them.

Marketers opened a terminal. Engineers got asked to "make it go viral". Same person now. This is their toolbox.

**Every entry tells you two things:** what it does, and how you plug in (MCP server, API, CLI, SDK, plugin, web app). Agents can skip the prose and read [`llms.txt`](llms.txt) or [`catalog.json`](catalog.json), remote MCP URLs included.

**Stay current:** new tools ship every Friday as a [release](https://github.com/proxy-intell/marketing-engineering/releases). Watch → Custom → Releases.

<!-- BEGIN CATALOG -->

## Contents

- [Ad intelligence](#ad-intelligence)
- [AI models & agents](#ai-models--agents)
- [Analytics](#analytics)
- [Browser automation](#browser-automation)
- [Data & scraping](#data--scraping)
- [Email](#email)
- [Launch & distribution](#launch--distribution)
- [Pricing & billing](#pricing--billing)
- [SEO & AEO](#seo--aeo)

## Ad intelligence

- [Proxy](https://useproxy.dev) - Live ad libraries for Meta, Google, LinkedIn and TikTok inside your AI assistant, with ad video and image analysis.

## AI models & agents

- [Claude Code](https://claude.com/claude-code) - Agentic coding tool in the terminal; writes landing pages, scripts and pipelines, and drives MCP servers for research and ops.
- [Gemini API](https://ai.google.dev) - Multimodal model API that watches video and reads images, handy for transcribing and breaking down ad creatives at scale.

## Analytics

- [PostHog](https://posthog.com) - Product analytics, web analytics, session replay, feature flags and experiments in one tool; queryable from an agent.

## Browser automation

- [Playwright](https://playwright.dev) - Scripts a real browser to screenshot landing pages, render OG images and click through funnels.

## Data & scraping

- [Exa](https://exa.ai) - Web search API built for LLMs; finds companies, competitors and pages by meaning rather than keywords.
- [ScrapeCreators](https://scrapecreators.com) - One API for public posts, profiles and ad libraries across TikTok, Instagram, YouTube, LinkedIn, X and more.

## Email

- [Resend](https://resend.com) - Email API for developers: transactional mail, broadcasts, contacts and templates written in React.

## Launch & distribution

- [Product Hunt](https://www.producthunt.com) - Launch platform and directory for new tech products; also a feed of what competitors just shipped.

## Pricing & billing

- [Autumn](https://useautumn.com) - Open-source pricing and billing layer over Stripe: define plans, credits and usage limits in config, then check and track them with one call.
- [Stripe](https://stripe.com) - Payments, checkout, subscriptions and billing portal APIs; the money end of every funnel.

## SEO & AEO

- [Bing Webmaster Tools](https://www.bing.com/webmasters) - Index coverage, keywords and backlinks for Bing, the index behind several AI search products.
- [Google Search Console](https://search.google.com/search-console) - Clicks, impressions, queries and indexing status for your site in Google Search, plus manual indexing requests.
- [IndexNow](https://www.indexnow.org) - Open protocol to ping Bing, Yandex and other engines the moment a URL is published or updated.
- [Perplexity Sonar API](https://docs.perplexity.ai) - Search-grounded answers with citations; useful for checking whether AI answers mention and cite your brand.
- [Semrush](https://www.semrush.com) - Keyword research, rank tracking, backlink data and competitor traffic estimates.

<!-- END CATALOG -->

## Contributing

Three ways in, from laziest to most hands-on:

1. **Fill the form.** [Suggest a tool](https://github.com/proxy-intell/marketing-engineering/issues/new?template=suggest-product.yml). Once a maintainer labels it `approved`, a bot opens the PR.
2. <a id="ask-your-agent"></a>**Ask your agent.** Paste this into Claude Code, Cursor or any agent with GitHub access:

   ```
   Add <tool URL> to github.com/proxy-intell/marketing-engineering. Follow AGENTS.md and open a PR.
   ```

3. **Open a PR yourself.** Edit `catalog.json`, run `python scripts/build.py`. Details in [CONTRIBUTING.md](CONTRIBUTING.md).

Listed? Grab the [badge](CONTRIBUTING.md#listed-add-the-badge): [![Featured on Marketing Engineering](https://img.shields.io/badge/featured%20on-Marketing%20Engineering-111111?style=flat-square)](https://github.com/proxy-intell/marketing-engineering)
