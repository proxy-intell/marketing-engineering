# What great GitHub lists do well

Notes behind this repo's shape. Adopt = done now; Later = when entries grow.

| List | What works | Here |
|---|---|---|
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | Strict entry format `[Name](url) - Desc.`; PR template checklist; one item per PR; high bar | Adopt |
| [awesome-lint](https://github.com/sindresorhus/awesome-lint) | CI lints format, dead links, alphabetical order | Adopt (CI) |
| [public-apis/public-apis](https://github.com/public-apis/public-apis) | Fixed attribute columns (Auth, HTTPS, CORS) make entries comparable; CI validates format + links | Adopt (`interfaces`, `pricing`, CI) |
| [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted-data) | Data (YAML) is source of truth; README generated from it | Adopt (`catalog.json` + `scripts/build.py`) |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Legend tags (language, local/remote) scannable at a glance; huge contributor volume | Tags via `interfaces`; legend later |
| [avelino/awesome-go](https://github.com/avelino/awesome-go) | Explicit quality criteria in CONTRIBUTING; maintainers prune stale entries | Adopt bar; pruning later |
| [llmstxt.org](https://llmstxt.org) | `llms.txt` spec: H1, blockquote summary, `##` link lists, `## Optional` | Adopt |

## Later

- [x] CI: schema-validate `catalog.json`, check README/llms.txt match it, dead-link check (weekly too).
- [x] Generate README + llms.txt from `catalog.json` (`scripts/build.py`).
- [ ] `awesome` badge + submission to sindresorhus/awesome once public and ≥30 days old.
- [x] Issue form for "suggest a product" (non-PR path).
