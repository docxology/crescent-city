# Tests — `tests/`

141 passing unit tests (zero-mock policy). Run: `bun test`

## Test Suite

| File | Module | Count |
| :--- | :--- | :--- |
| `constants.test.ts` | Base constants | 5 |
| `constants-extended.test.ts` | Env-overridable constants | 10 |
| `logger.test.ts` | Structured logger | 6 |
| `utils.test.ts` | Hash, flatten, CSV, HTML, filename | 22 |
| `shared-paths.test.ts` | Output path constants | 10 |
| `shared-data.test.ts` | Data loader contracts | 6 |
| `toc.test.ts` | TOC pure functions | 10 |
| `search.test.ts` | Full-text search engine | 8 |
| `analytics.test.ts` | PCA, K-means | 7 |
| `routes.test.ts` | API route handlers | 7 |
| `llm-config.test.ts` | LLM configuration | 8 |
| `embeddings.test.ts` | Text chunking | 7 |
| `export.test.ts` | Export formatting | 12 |
| `domains.test.ts` | Intelligence domains | 14 |
| `monitor.test.ts` | Monitor report shape | 3 |
| `news_monitor.test.ts` | RSS monitor error-path | 3 |
| `gov_meeting_monitor.test.ts` | Meeting monitor + disk | 2 |
| **Total** | | **141** |

## Running

```bash
bun test                          # all tests
bun test tests/utils.test.ts      # specific file
bun test --watch                  # watch mode
```

See [AGENTS.md](AGENTS.md) for conventions and how to add new tests.
