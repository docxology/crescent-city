# LLM Module

## `src/llm/config.ts` — Configuration

Centralized configuration for LLM services, with environment variable overrides.

| Property | Default | Env Var | Description |
|----------|---------|---------|-------------|
| `ollamaUrl` | `http://localhost:11434` | `OLLAMA_URL` | Ollama API base URL |
| `embeddingModel` | `nomic-embed-text` | `EMBEDDING_MODEL` | Model for embeddings |
| `chatModel` | `gemma3:4b` | `CHAT_MODEL` | Model for chat/summarization |
| `chromaUrl` | `http://localhost:8000` | `CHROMA_URL` | ChromaDB server URL |
| `collectionName` | `crescent-city-code` | — | ChromaDB collection name |
| `chunkSize` | `1500` | — | Characters per text chunk |
| `chunkOverlap` | `150` | — | Overlap between chunks |
| `topK` | `10` | — | Top results for RAG retrieval |

---

## `src/llm/ollama.ts` — Ollama API Wrapper

| Function | Signature | Description |
|----------|-----------|-------------|
| `embed` | `(text) → Promise<number[]>` | Generate embedding for single text via `/api/embed` |
| `embedBatch` | `(texts) → Promise<number[][]>` | Batch embedding via `/api/embed` with multiple inputs |
| `chat` | `(messages, context?) → Promise<string>` | Chat completion via `/api/chat` (non-streaming). Injects system prompt with optional context. |
| `listModels` | `() → Promise<string[]>` | List available models via `/api/tags` |
| `isOllamaRunning` | `() → Promise<boolean>` | Health check via `/api/tags` |

---

## `src/llm/chroma.ts` — ChromaDB Client

| Function | Signature | Description |
|----------|-----------|-------------|
| `getOrCreateCollection` | `() → Promise<Collection>` | Returns singleton collection (cosine similarity). |
| `addDocuments` | `(docs) → Promise<void>` | Upsert documents with embeddings and metadata. |
| `query` | `(embedding, topK?) → Promise<{ids, documents, metadatas, distances}>` | Query by embedding vector. |
| `getStats` | `() → Promise<{count, name}>` | Collection document count and name. |
| `isChromaRunning` | `() → Promise<boolean>` | Health check via heartbeat. |

---

## `src/llm/embeddings.ts` — Indexing Pipeline

| Function | Signature | Description |
|----------|-----------|-------------|
| `isIndexed` | `() → Promise<boolean>` | Check if collection has documents. |
| `indexAllSections` | `() → Promise<void>` | Load all sections, chunk, embed, and store in ChromaDB. |

### Chunking Strategy

- Chunk size: 1500 characters
- Overlap: 150 characters
- Each chunk prefixed with `{sectionNumber}: {sectionTitle}`
- Metadata includes: `sectionGuid`, `sectionNumber`, `sectionTitle`, `articleGuid`, `articleTitle`, `chunkIndex`
- Batch size: 32 chunks per embedding request, with single-chunk fallback on failure

---

## `src/llm/rag.ts` — RAG Pipeline

| Function | Signature | Description |
|----------|-----------|-------------|
| `ragQuery` | `(userQuestion) → Promise<RagResponse>` | Full RAG pipeline: embed → retrieve → generate. |

### Pipeline Steps

1. **Embed** question via `embed()`
2. **Retrieve** top-K similar chunks from ChromaDB via `query()`
3. **Build context** from retrieved documents with section citations
4. **Generate** answer via `chat()` with injected context
5. **Return** answer + sources (with similarity scores)

---

## `src/llm/index.ts` — CLI Entry Point

| Command | Description |
|---------|-------------|
| `bun run index` | Index all sections into ChromaDB |
| `bun run chat` | Interactive REPL chat |
| `bun run query "..."` | Single RAG query |
| `bun run status` | Show Ollama/ChromaDB status and stats |
