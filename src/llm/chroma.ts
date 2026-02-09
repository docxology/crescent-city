/** ChromaDB client wrapper for vector storage and retrieval */
import { ChromaClient, type Collection } from "chromadb";
import { llmConfig } from "./config.js";

let client: ChromaClient | null = null;
let collection: Collection | null = null;

function getClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({ path: llmConfig.chromaUrl });
  }
  return client;
}

/** Get or create the municipal code collection */
export async function getOrCreateCollection(): Promise<Collection> {
  if (collection) return collection;
  const c = getClient();
  collection = await c.getOrCreateCollection({
    name: llmConfig.collectionName,
    metadata: { "hnsw:space": "cosine" },
  });
  return collection;
}

/** Add documents with embeddings and metadata */
export async function addDocuments(docs: {
  ids: string[];
  embeddings: number[][];
  documents: string[];
  metadatas: Record<string, string>[];
}): Promise<void> {
  const coll = await getOrCreateCollection();
  await coll.upsert({
    ids: docs.ids,
    embeddings: docs.embeddings,
    documents: docs.documents,
    metadatas: docs.metadatas,
  });
}

/** Query the collection by embedding vector */
export async function query(
  embedding: number[],
  topK: number = llmConfig.topK
): Promise<{
  ids: string[];
  documents: string[];
  metadatas: Record<string, string>[];
  distances: number[];
}> {
  const coll = await getOrCreateCollection();
  const results = await coll.query({
    queryEmbeddings: [embedding],
    nResults: topK,
  });

  return {
    ids: (results.ids[0] ?? []) as string[],
    documents: (results.documents?.[0] ?? []) as string[],
    metadatas: (results.metadatas?.[0] ?? []) as Record<string, string>[],
    distances: (results.distances?.[0] ?? []) as number[],
  };
}

/** Get collection statistics */
export async function getStats(): Promise<{ count: number; name: string }> {
  const coll = await getOrCreateCollection();
  const count = await coll.count();
  return { count, name: llmConfig.collectionName };
}

/** Check if ChromaDB is reachable */
export async function isChromaRunning(): Promise<boolean> {
  try {
    const c = getClient();
    await c.heartbeat();
    return true;
  } catch {
    return false;
  }
}
