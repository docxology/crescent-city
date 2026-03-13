/** Indexing pipeline — loads sections, chunks, embeds, and stores in ChromaDB */
import { loadAllSections } from "../shared/data.js";
import { embed, embedBatch } from "./ollama.js";
import { addDocuments, getStats } from "./chroma.js";
import { llmConfig } from "./config.js";
import { EMBED_BATCH_SIZE } from "../constants.js";
import { createLogger } from "../logger.js";
import type { FlatSection } from "../types.js";

const log = createLogger("embeddings");

/** Split text into overlapping chunks */
export function chunkText(
  text: string,
  chunkSize = llmConfig.chunkSize,
  overlap = llmConfig.chunkOverlap
): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

/** Check if the collection already has the expected number of documents */
export async function isIndexed(): Promise<boolean> {
  try {
    const stats = await getStats();
    return stats.count > 0;
  } catch {
    return false;
  }
}

/** Index all sections into ChromaDB */
export async function indexAllSections(): Promise<void> {
  log.info("Loading all sections...");
  const sections = await loadAllSections();
  log.info(`Found ${sections.length} sections to index`);

  // Check existing index
  const stats = await getStats();
  if (stats.count > 0) {
    log.info(`Collection already has ${stats.count} documents`);
  }

  // Prepare chunks with metadata
  const allChunks: {
    id: string;
    text: string;
    metadata: Record<string, string>;
  }[] = [];

  for (const section of sections) {
    const text = `${section.number}: ${section.title}\n${section.text}`;
    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        id: `${section.guid}_${i}`,
        text: chunks[i],
        metadata: {
          sectionGuid: section.guid,
          sectionNumber: section.number,
          sectionTitle: section.title,
          articleGuid: section.articleGuid,
          articleTitle: section.articleTitle,
          chunkIndex: String(i),
        },
      });
    }
  }

  log.info(`Total chunks to embed: ${allChunks.length}`);

  // Process in batches
  let indexed = 0;

  for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    try {
      const embeddings = await embedBatch(texts);

      await addDocuments({
        ids: batch.map((c) => c.id),
        embeddings,
        documents: texts,
        metadatas: batch.map((c) => c.metadata),
      });

      indexed += batch.length;
      if (indexed % 100 === 0 || indexed === allChunks.length) {
        log.info(`Indexed ${indexed}/${allChunks.length} chunks...`);
      }
    } catch (err: any) {
      log.error(`Error indexing batch at ${i}`, { error: err.message });
      // Try one at a time as fallback
      for (const chunk of batch) {
        try {
          const embedding = await embed(chunk.text);
          await addDocuments({
            ids: [chunk.id],
            embeddings: [embedding],
            documents: [chunk.text],
            metadatas: [chunk.metadata],
          });
          indexed++;
        } catch (e: any) {
          log.error(`Failed to index chunk ${chunk.id}`, { error: e.message });
        }
      }
    }
  }

  const finalStats = await getStats();
  log.info(`Indexing complete: ${finalStats.count} documents in collection`);
}
