/** Ollama API wrapper for embeddings and chat */
import type { ChatMessage } from "../types.js";
import { llmConfig } from "./config.js";

const BASE = () => llmConfig.ollamaUrl;

/** Generate an embedding for a single text */
export async function embed(text: string): Promise<number[]> {
  const resp = await fetch(`${BASE()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: llmConfig.embeddingModel,
      input: text,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Ollama embed failed (${resp.status}): ${await resp.text()}`);
  }

  const data = await resp.json() as { embeddings: number[][] };
  return data.embeddings[0];
}

/** Generate embeddings for a batch of texts */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const resp = await fetch(`${BASE()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: llmConfig.embeddingModel,
      input: texts,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Ollama embedBatch failed (${resp.status}): ${await resp.text()}`);
  }

  const data = await resp.json() as { embeddings: number[][] };
  return data.embeddings;
}

/** Chat with the model, optionally injecting context into the system prompt */
export async function chat(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  const systemPrompt =
    "You are a helpful assistant that answers questions about the Crescent City Municipal Code. " +
    "Use only the provided context to answer. Cite section numbers when possible. " +
    "If the context doesn't contain enough information, say so.";

  const fullMessages: ChatMessage[] = [
    {
      role: "system",
      content: context
        ? `${systemPrompt}\n\nContext from the municipal code:\n${context}`
        : systemPrompt,
    },
    ...messages,
  ];

  const resp = await fetch(`${BASE()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: llmConfig.chatModel,
      messages: fullMessages,
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Ollama chat failed (${resp.status}): ${await resp.text()}`);
  }

  const data = await resp.json() as { message: { content: string } };
  return data.message.content;
}

/** List available models from Ollama */
export async function listModels(): Promise<string[]> {
  const resp = await fetch(`${BASE()}/api/tags`);
  if (!resp.ok) {
    throw new Error(`Ollama listModels failed (${resp.status}): ${await resp.text()}`);
  }
  const data = await resp.json() as { models: { name: string }[] };
  return data.models.map((m) => m.name);
}

/** Check if Ollama is reachable */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE()}/api/tags`);
    return resp.ok;
  } catch {
    return false;
  }
}
