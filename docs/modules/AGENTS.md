# Agents Guide — `docs/modules/`

## Overview

Per-module documentation files. Each file covers one logical component of the system.

## Files

| File | Covers |
|---|---|
| `scraping.md` | `browser.ts`, `toc.ts`, `content.ts`, `scrape.ts` |
| `verification.md` | `verify.ts` |
| `export.md` | `export.ts` |
| `gui.md` | `server.ts`, `routes.ts`, `search.ts`, `analytics.ts` |
| `llm.md` | `config.ts`, `ollama.ts`, `chroma.ts`, `embeddings.ts`, `rag.ts`, `index.ts` |
| `shared.md` | `paths.ts`, `data.ts` |

## Convention

Each module doc includes: purpose, exported functions with signatures, key patterns, data flow, and dependencies.
