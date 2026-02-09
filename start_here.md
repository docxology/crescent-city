# Start Here — Crescent City Municipal Code

Complete setup guide to get the scraper, web viewer, and RAG chat running.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| [Bun](https://bun.sh) | v1.0+ | `curl -fsSL https://bun.sh/install \| bash` |
| [Ollama](https://ollama.ai) | Latest | `brew install ollama` or [download](https://ollama.ai/download) |
| [ChromaDB](https://www.trychroma.com) | Latest | `pip install chromadb` |
| Python 3 | 3.9+ | Required for ChromaDB |

> **Note**: Ollama + ChromaDB are only needed for LLM/RAG features. The scraper and web viewer work without them.

---

## Step 1: Install Dependencies

```bash
cd crescent-city
bun install
```

This installs Playwright (browser automation) and ChromaDB client.

---

## Step 2: Scrape the Municipal Code

```bash
bun run scrape
```

This launches a visible Chromium browser, bypasses Cloudflare Turnstile, and downloads all 242 articles (2194 sections) from [ecode360.com/CR4919](https://ecode360.com/CR4919). Takes ~10–15 minutes.

**Resume support**: If interrupted, run `bun run scrape` again — it picks up where it left off.

Output: `output/articles/*.json` + `output/toc.json` + `output/manifest.json`

---

## Step 3: Verify Integrity

```bash
bun run verify
```

Re-computes SHA-256 hashes and cross-references every section against the official TOC. Also re-fetches 5 random pages from the live site to confirm data freshness.

Output: `output/verification-report.json`

---

## Step 4: Export

```bash
bun run export
```

Generates four formats:

| Format | Output |
|--------|--------|
| JSON | `output/crescent-city-code.json` |
| Markdown | `output/markdown/` (organized by Title) |
| Text | `output/crescent-city-code.txt` |
| CSV | `output/section-index.csv` |

---

## Step 5: Launch Web Viewer

```bash
bun run gui
```

Open **<http://localhost:3000>** in your browser. Features:

- 📋 Collapsible TOC tree navigation
- 📖 Formatted section viewer
- 🔍 Instant full-text search
- 🌗 Dark / Light mode
- 📊 Analytics dashboard (bar charts, PCA scatter plot, word loadings)
- ✨ Per-section AI summaries (requires Ollama)
- 💬 RAG chat with source citations (requires Ollama + ChromaDB)

---

## Step 6: Set Up LLM / RAG Chat (Optional)

### 6a. Start Ollama

```bash
# In a separate terminal:
ollama serve

# Pull required models:
ollama pull nomic-embed-text
ollama pull gemma3:4b
```

### 6b. Start ChromaDB

```bash
# In another terminal:
chroma run --path chroma_data
```

### 6c. Index Sections

```bash
bun run index
```

Chunks all sections, generates embeddings via Ollama, and stores them in ChromaDB.

### 6d. Use RAG Chat

```bash
# Interactive mode:
bun run chat

# Single query:
bun run query "What are the zoning regulations for residential areas?"

# Check status:
bun run status
```

The web viewer's chat panel (💬 button) also connects to the RAG pipeline once services are running.

---

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run scrape` | Scrape municipal code (resumable) |
| `bun run verify` | Verify data integrity |
| `bun run export` | Export JSON, Markdown, TXT, CSV |
| `bun run all` | Run scrape → verify → export |
| `bun run gui` | Web viewer on <http://localhost:3000> |
| `bun run index` | Index sections into ChromaDB |
| `bun run chat` | Interactive RAG chat |
| `bun run query "..."` | Single RAG query |
| `bun run status` | Check Ollama/ChromaDB/index status |
| `bun test` | Run tests (85 tests, 9 files) |

---

## Environment Variables

All optional — defaults work out of the box.

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API server |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model |
| `CHAT_MODEL` | `gemma3:4b` | Chat model |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server |
| `PORT` | `3000` | GUI server port |

---

## Troubleshooting

**Scraper gets stuck on Cloudflare**: The browser window should show a brief "Just a moment..." page then resolve. If it hangs, close the browser and re-run — the manifest ensures safe resume.

**ChromaDB won't start**: Make sure Python 3.9+ is installed and `pip install chromadb` completed. Run `chroma run --path chroma_data` from the project root.

**Ollama models not found**: Run `ollama list` to check installed models. If missing, `ollama pull nomic-embed-text && ollama pull gemma3:4b`.

**Tests fail**: Run `bun install` first. Tests require scraped data in `output/` for data-dependent test files (`shared-data.test.ts`, `search.test.ts`).
