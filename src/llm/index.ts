#!/usr/bin/env bun
/** LLM module CLI entry point */
import { indexAllSections, isIndexed } from "./embeddings.js";
import { ragQuery } from "./rag.js";
import { getStats, isChromaRunning } from "./chroma.js";
import { isOllamaRunning, listModels } from "./ollama.js";
import { llmConfig } from "./config.js";
import * as readline from "readline";

const command = process.argv[2];

async function checkPrerequisites(): Promise<boolean> {
  const ollama = await isOllamaRunning();
  const chroma = await isChromaRunning();

  if (!ollama) {
    console.error("ERROR: Ollama is not running at", llmConfig.ollamaUrl);
    console.error("Start Ollama: ollama serve");
    return false;
  }
  if (!chroma) {
    console.error("ERROR: ChromaDB is not running at", llmConfig.chromaUrl);
    console.error("Start ChromaDB: chroma run --path chroma_data");
    return false;
  }
  return true;
}

async function runIndex() {
  console.log("=== Crescent City Municipal Code — Indexing Pipeline ===\n");
  if (!(await checkPrerequisites())) process.exit(1);
  await indexAllSections();
}

async function runChat() {
  console.log("=== Crescent City Municipal Code — RAG Chat ===\n");
  if (!(await checkPrerequisites())) process.exit(1);

  const indexed = await isIndexed();
  if (!indexed) {
    console.error("ERROR: No documents indexed. Run 'bun run index' first.");
    process.exit(1);
  }

  const stats = await getStats();
  console.log(`Collection: ${stats.name} (${stats.count} documents)`);
  console.log(`Chat model: ${llmConfig.chatModel}`);
  console.log('Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question("You: ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        const response = await ragQuery(trimmed);
        console.log(`\nAssistant: ${response.answer}`);
        if (response.sources.length > 0) {
          console.log("\nSources:");
          for (const s of response.sources) {
            console.log(`  - ${s.sectionNumber}: ${s.sectionTitle} (score: ${s.score.toFixed(3)})`);
          }
        }
        console.log("");
      } catch (err: any) {
        console.error(`Error: ${err.message}\n`);
      }

      ask();
    });
  };

  ask();
}

async function runQuery() {
  const question = process.argv.slice(3).join(" ");
  if (!question) {
    console.error("Usage: bun run src/llm/index.ts query \"your question here\"");
    process.exit(1);
  }

  if (!(await checkPrerequisites())) process.exit(1);

  const indexed = await isIndexed();
  if (!indexed) {
    console.error("ERROR: No documents indexed. Run 'bun run index' first.");
    process.exit(1);
  }

  console.log(`Question: ${question}\n`);
  const response = await ragQuery(question);
  console.log(`Answer: ${response.answer}\n`);

  if (response.sources.length > 0) {
    console.log("Sources:");
    for (const s of response.sources) {
      console.log(`  - ${s.sectionNumber}: ${s.sectionTitle} (score: ${s.score.toFixed(3)})`);
    }
  }
}

async function runStatus() {
  console.log("=== Crescent City Municipal Code — LLM Status ===\n");

  const ollama = await isOllamaRunning();
  console.log(`Ollama (${llmConfig.ollamaUrl}): ${ollama ? "RUNNING" : "NOT RUNNING"}`);

  if (ollama) {
    try {
      const models = await listModels();
      console.log(`  Models: ${models.join(", ") || "none"}`);
      console.log(`  Embedding model: ${llmConfig.embeddingModel}`);
      console.log(`  Chat model: ${llmConfig.chatModel}`);
    } catch {}
  }

  const chroma = await isChromaRunning();
  console.log(`ChromaDB (${llmConfig.chromaUrl}): ${chroma ? "RUNNING" : "NOT RUNNING"}`);

  if (chroma) {
    try {
      const stats = await getStats();
      console.log(`  Collection: ${stats.name}`);
      console.log(`  Documents: ${stats.count}`);
    } catch {}
  }
}

switch (command) {
  case "index":
    await runIndex();
    break;
  case "chat":
    await runChat();
    break;
  case "query":
    await runQuery();
    break;
  case "status":
    await runStatus();
    break;
  default:
    console.log("Crescent City Municipal Code — LLM Module\n");
    console.log("Commands:");
    console.log("  bun run src/llm/index.ts index    Index all sections into ChromaDB");
    console.log("  bun run src/llm/index.ts chat     Interactive RAG chat");
    console.log('  bun run src/llm/index.ts query "question"  Single query');
    console.log("  bun run src/llm/index.ts status   Show index stats and model info");
    break;
}
