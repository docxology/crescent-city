/** RAG pipeline — retrieval-augmented generation for municipal code Q&A */
import type { ChatMessage, RagResponse, RagSource } from "../types.js";
import { embed, chat } from "./ollama.js";
import { query } from "./chroma.js";
import { llmConfig } from "./config.js";

/** Query the RAG pipeline with a user question */
export async function ragQuery(userQuestion: string): Promise<RagResponse> {
  // Step 1: Embed the question
  const questionEmbedding = await embed(userQuestion);

  // Step 2: Search ChromaDB for similar chunks
  const results = await query(questionEmbedding, llmConfig.topK);

  // Step 3: Build context from retrieved chunks
  const sources: RagSource[] = [];
  const contextParts: string[] = [];

  for (let i = 0; i < results.ids.length; i++) {
    const doc = results.documents[i];
    const meta = results.metadatas[i];
    const distance = results.distances[i];

    contextParts.push(
      `[${meta.sectionNumber}: ${meta.sectionTitle}]\n${doc}\n`
    );

    sources.push({
      sectionGuid: meta.sectionGuid,
      sectionNumber: meta.sectionNumber,
      sectionTitle: meta.sectionTitle,
      snippet: doc.substring(0, 200),
      score: 1 - distance, // Convert distance to similarity
    });
  }

  const context = contextParts.join("\n---\n");

  // Step 4: Generate answer with context
  const messages: ChatMessage[] = [
    { role: "user", content: userQuestion },
  ];

  const answer = await chat(messages, context);

  return {
    answer,
    sources,
    model: llmConfig.chatModel,
  };
}
