/** Configuration for the LLM/RAG module */

export const llmConfig = {
  /** Ollama server base URL */
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",

  /** Embedding model name */
  embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",

  /** Chat model name */
  chatModel: process.env.CHAT_MODEL ?? "gemma3:4b",

  /** ChromaDB server URL */
  chromaUrl: process.env.CHROMA_URL ?? "http://localhost:8000",

  /** ChromaDB collection name */
  collectionName: "crescent-city-code",

  /** Chunk size in characters for text splitting */
  chunkSize: 1500,

  /** Overlap between chunks in characters */
  chunkOverlap: 150,

  /** Number of top results to retrieve for RAG */
  topK: 10,
};
