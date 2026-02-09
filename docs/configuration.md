# Configuration

All configurable parameters for the Crescent City Municipal Code project.

## Constants (`src/constants.ts`)

Hard-coded project constants. Change these to target a different municipality.

| Constant | Value | Description |
|----------|-------|-------------|
| `BASE_URL` | `https://ecode360.com` | ecode360 base URL |
| `MUNICIPALITY_CODE` | `CR4919` | Crescent City municipality identifier |
| `OUTPUT_DIR` | `output` | Root output directory |
| `ARTICLES_DIR` | `output/articles` | Per-article JSON storage |
| `RATE_LIMIT_MS` | `2000` | Milliseconds between scrape requests |

## Environment Variables

All LLM-related settings can be overridden via environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API server |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Ollama model for embeddings |
| `CHAT_MODEL` | `gemma3:4b` | Ollama model for chat/summarization |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server |
| `PORT` | `3000` | GUI server port |

## LLM Tuning Parameters (`src/llm/config.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `collectionName` | `crescent-city-code` | ChromaDB collection name |
| `chunkSize` | `1500` | Characters per text chunk for embedding |
| `chunkOverlap` | `150` | Character overlap between adjacent chunks |
| `topK` | `10` | Number of results retrieved for RAG queries |

## Scraper Parameters

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| `RATE_LIMIT_MS` | `constants.ts` | `2000` | Inter-request delay |
| `timeout` | `browser.ts` | `60000` | Cloudflare wait timeout (ms) |
| `SAMPLE_SIZE` | `verify.ts` | `5` | Random re-fetch sample size |

## Analytics Parameters (`src/gui/analytics.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `NUM_PCS` | `10` | Number of principal components |
| `MAX_POINTS` | `2000` | Max points for PCA (sub-sampled) |
| `k` (K-Means) | `6` | Number of clusters |
| `iterations` (Power) | `20` | Power iteration count per PC |
| `BATCH` (ChromaDB fetch) | `500` | ChromaDB batch fetch size |
