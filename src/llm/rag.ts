/** RAG pipeline — retrieval-augmented generation for municipal code Q&A */
import type { ChatMessage, RagResponse, RagSource } from "../types.js";
import { embed, chat } from "./ollama.js";
import { query } from "./chroma.js";
import { llmConfig } from "./config.js";
import { appendFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

// ─── Query logging ────────────────────────────────────────────────

const RAG_LOG_PATH = "output/rag-queries.jsonl";

async function logRagQuery(
  question: string,
  answer: string,
  sources: RagSource[],
  latencyMs: number,
  model: string
): Promise<void> {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    question,
    answerSnippet: answer.substring(0, 200),
    sourceCount: sources.length,
    topSource: sources[0]?.sectionNumber ?? null,
    latencyMs,
    model,
  });
  try {
    if (!existsSync("output")) await mkdir("output", { recursive: true });
    await appendFile(RAG_LOG_PATH, entry + "\n");
  } catch {
    // Non-fatal — log path may not exist before first scrape
  }
}

// ─── RAG pipeline ─────────────────────────────────────────────────

/** Query the RAG pipeline with a user question */
export async function ragQuery(userQuestion: string): Promise<RagResponse> {
  const start = Date.now();

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
      score: Math.round((1 - distance) * 1000) / 1000, // 3 decimal places
    });
  }

  const context = contextParts.join("\n---\n");

  // Step 4: Generate answer with context
  const messages: ChatMessage[] = [
    { role: "user", content: userQuestion },
  ];

  const answer = await chat(messages, context);
  const latencyMs = Date.now() - start;

  // Log the query asynchronously (non-blocking)
  void logRagQuery(userQuestion, answer, sources, latencyMs, llmConfig.chatModel);

  return {
    answer,
    sources,
    model: llmConfig.chatModel,
  };
}
