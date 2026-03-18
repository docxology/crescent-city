# LLM / RAG Pipeline — `src/llm/`

Ollama-powered embeddings, ChromaDB vector store, and RAG chat for the Crescent City municipal code.

## Prerequisites

```bash
# Start Ollama
ollama serve &
ollama pull nomic-embed-text
ollama pull gemma3:4b

# Start ChromaDB
chroma run --path chroma_data &
```

## Modules

| File | Purpose |
| :--- | :--- |
| `config.ts` | All tunable parameters (URLs, models, chunk size, topK) |
| `ollama.ts` | Ollama REST wrapper: `embed()`, `chat()`, `listModels()` |
| `chroma.ts` | ChromaDB client: `getOrCreateCollection()`, `addDocuments()`, `query()` |
| `embeddings.ts` | Chunking pipeline + bulk `indexAllSections()` into ChromaDB |
| `rag.ts` | Full RAG pipeline: embed question → retrieve top-K → `ragQuery()` |
| `index.ts` | CLI entry: `index`, `chat`, `query`, `status` commands |

## RAG Flow

```
input question
    → nomic-embed-text (embed)
    → ChromaDB (top-K nearest chunks)
    → gemma3:4b (generate answer with cited sources)
    → { answer, sources[] }
```

## Commands

```bash
bun run index        # chunk + embed all sections into ChromaDB
bun run chat         # interactive RAG conversation
bun run query "..."  # single-shot RAG query
bun run status       # show ChromaDB collection stats + Ollama models
```

## Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model |
| `CHAT_MODEL` | `gemma3:4b` | Chat model |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server |
