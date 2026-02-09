# Agents Guide — `src/llm/`

## Overview

RAG (Retrieval-Augmented Generation) pipeline using Ollama for embeddings/chat and ChromaDB for vector storage.

## Files

| File | Purpose | Tests |
|---|---|---|
| `config.ts` | Centralized LLM/RAG configuration constants | `tests/llm-config.test.ts` |
| `ollama.ts` | Ollama API wrapper (embed, chat, list models) | Manual only (requires Ollama) |
| `chroma.ts` | ChromaDB client wrapper (add, query, stats) | Manual only (requires ChromaDB) |
| `embeddings.ts` | Chunking pipeline + bulk indexing into ChromaDB | Manual only |
| `rag.ts` | RAG pipeline: embed question → query ChromaDB → Ollama chat | Manual only |
| `index.ts` | CLI entry point: `index`, `chat`, `query`, `status` commands | Manual only |

## Prerequisites

- **Ollama** running at `localhost:11434` with models `nomic-embed-text` and `gemma3:4b`
- **ChromaDB** running at `localhost:8000`

## Key Patterns

- `llmConfig` object centralizes all tunable parameters (URLs, model names, chunk size, overlap, topK).
- `indexAllSections()` skips re-indexing if the collection already contains documents.
- `ragQuery()` returns both the answer text and source documents with relevance scores.
