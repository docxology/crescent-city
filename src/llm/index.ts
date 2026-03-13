#!/usr/bin/env bun
/** LLM module CLI entry point */
import { indexAllSections, isIndexed } from "./embeddings.js";
import { ragQuery } from "./rag.js";
import { getStats, isChromaRunning, waitForChroma } from "./chroma.js";
import { isOllamaRunning, listModels } from "./ollama.js";
import { llmConfig } from "./config.js";
import { createLogger } from "../logger.js";
import * as readline from "readline";

const log = createLogger("llm-cli");
const command = process.argv[2];

async function checkPrerequisites(): Promise<boolean> {
  const ollama = await isOllamaRunning();
  const chroma = await isChromaRunning();

  if (!ollama) {
    log.error(`Ollama is not running at ${llmConfig.ollamaUrl}`);
    log.error("Start Ollama: ollama serve");
    return false;
  }
  if (!chroma) {
    log.warn(`ChromaDB not responding at ${llmConfig.chromaUrl}, retrying...`);
    const ok = await waitForChroma(3, 1000);
    if (!ok) {
      log.error(`ChromaDB is not running at ${llmConfig.chromaUrl}`);
      log.error(`Start ChromaDB: chroma run --path chroma_data --port ${new URL(llmConfig.chromaUrl).port}`);
      return false;
    }
  }
  return true;
}

async function runIndex() {
  log.info("=== Crescent City Municipal Code — Indexing Pipeline ===");
  if (!(await checkPrerequisites())) process.exit(1);
  await indexAllSections();
}

async function runChat() {
  log.info("=== Crescent City Municipal Code — RAG Chat ===");
  if (!(await checkPrerequisites())) process.exit(1);

  const indexed = await isIndexed();
  if (!indexed) {
    log.error("No documents indexed. Run 'bun run index' first.");
    process.exit(1);
  }

  const stats = await getStats();
  log.info(`Collection: ${stats.name} (${stats.count} documents)`);
  log.info(`Chat model: ${llmConfig.chatModel}`);
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
        log.error(`Query failed: ${err.message}`);
      }

      ask();
    });
  };

  ask();
}

async function runQuery() {
  const question = process.argv.slice(3).join(" ");
  if (!question) {
    log.error('Usage: bun run src/llm/index.ts query "your question here"');
    process.exit(1);
  }

  if (!(await checkPrerequisites())) process.exit(1);

  const indexed = await isIndexed();
  if (!indexed) {
    log.error("No documents indexed. Run 'bun run index' first.");
    process.exit(1);
  }

  log.info(`Question: ${question}`);
  const response = await ragQuery(question);
  console.log(`\nAnswer: ${response.answer}\n`);

  if (response.sources.length > 0) {
    console.log("Sources:");
    for (const s of response.sources) {
      console.log(`  - ${s.sectionNumber}: ${s.sectionTitle} (score: ${s.score.toFixed(3)})`);
    }
  }
}

async function runStatus() {
  log.info("=== Crescent City Municipal Code — LLM Status ===");

  const ollama = await isOllamaRunning();
  log.info(`Ollama (${llmConfig.ollamaUrl}): ${ollama ? "✅ RUNNING" : "❌ NOT RUNNING"}`);

  if (ollama) {
    try {
      const models = await listModels();
      log.info(`  Models: ${models.join(", ") || "none"}`);
      log.info(`  Embedding model: ${llmConfig.embeddingModel}`);
      log.info(`  Chat model: ${llmConfig.chatModel}`);
    } catch {}
  }

  const chroma = await isChromaRunning();
  log.info(`ChromaDB (${llmConfig.chromaUrl}): ${chroma ? "✅ RUNNING" : "❌ NOT RUNNING"}`);

  if (chroma) {
    try {
      const stats = await getStats();
      log.info(`  Collection: ${stats.name}`);
      log.info(`  Documents: ${stats.count}`);
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

