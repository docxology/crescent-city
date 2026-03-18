# Configuration

All configurable parameters for the Crescent City Municipal Code project.

## Core Constants (`src/constants.ts`)

Hard-coded project constants. Change these to target a different municipality.

| Constant | Value | Description |
| :--- | :--- | :--- |
| `BASE_URL` | `https://ecode360.com` | ecode360 base URL |
| `MUNICIPALITY_CODE` | `CR4919` | Crescent City municipality identifier |
| `OUTPUT_DIR` | `output` | Root output directory |
| `ARTICLES_DIR` | `output/articles` | Per-article JSON storage |
| `RATE_LIMIT_MS` | `2000` | Default ms between scrape requests (env-overridable) |
| `SCRAPE_TIMEOUT_MS` | `60000` | Cloudflare wait timeout (env-overridable) |
| `CLOUDFLARE_WAIT_MS` | `3000` | Extra wait after Cloudflare resolves |
| `SPA_RENDER_MS` | `2000` | SPA render settle time |
| `MAX_RETRIES` | `3` | Max retry attempts per article |
| `VERIFY_SAMPLE_SIZE` | `5` | Random re-fetch sample for verification |
| `EMBED_BATCH_SIZE` | `32` | Chunks per Ollama embedding request |
| `OLLAMA_TIMEOUT_MS` | `120000` | Ollama request timeout |

## Environment Variables

### GUI Server

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | GUI server port |
| `LOG_LEVEL` | `info` | Log verbosity (`debug`, `info`, `warn`, `error`) |

### LLM / RAG

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API server |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Ollama model for embeddings |
| `CHAT_MODEL` | `gemma3:4b` | Ollama model for chat/summarization |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server |

### API Security

| Variable | Default | Description |
| :--- | :--- | :--- |
| `CRESCENT_CITY_API_KEY` | `dev-key-12345` | Valid API key for `/api/*` endpoints |
| `RATE_LIMIT_MS` | `2000` | Minimum ms between requests per client IP |

### Scraper

| Variable | Default | Description |
| :--- | :--- | :--- |
| `RATE_LIMIT_MS` | `2000` | Inter-request delay |
| `SCRAPE_TIMEOUT_MS` | `60000` | Cloudflare wait timeout |

## LLM Tuning Parameters (`src/llm/config.ts`)

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `collectionName` | `crescent-city-code` | ChromaDB collection name |
| `chunkSize` | `1500` | Characters per text chunk for embedding |
| `chunkOverlap` | `150` | Character overlap between adjacent chunks |
| `topK` | `10` | Number of results retrieved per RAG query |

## Analytics Parameters (`src/gui/analytics.ts`)

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `NUM_PCS` | `10` | Number of principal components |
| `MAX_POINTS` | `2000` | Max points for PCA (sub-sampled if more) |
| K-Means `k` | `6` | Number of clusters |
| Power iteration count | `20` | Iterations per principal component |
| ChromaDB batch size | `500` | Vectors fetched per ChromaDB request |

## Alert Monitor Parameters

| File | Parameter | Default | Description |
| :--- | :--- | :--- | :--- |
| `usgs_earthquake.ts` | `SEARCH_RADIUS_KM` | `200` | Max distance from Crescent City for quakes |
| `usgs_earthquake.ts` | `MIN_MAGNITUDE` | `4.0` | Minimum earthquake magnitude |
| `nws_weather.ts` | NWS zone | `CAZ006` | Northwest CA coastal zone code |

## Example: Override Multiple Settings

```bash
PORT=8080 LOG_LEVEL=debug OLLAMA_URL=http://my-server:11434 bun run gui
```
