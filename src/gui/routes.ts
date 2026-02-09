/** API route handlers for the GUI server */
import { loadToc, loadArticle, loadManifest } from "../shared/data.js";
import { search, getIndexedCount } from "./search.js";
import { ragQuery } from "../llm/rag.js";
import { isOllamaRunning, chat } from "../llm/ollama.js";
import { isChromaRunning } from "../llm/chroma.js";
import { isIndexed } from "../llm/embeddings.js";
import { llmConfig } from "../llm/config.js";
import { getCodeStats, getEmbeddingProjection } from "./analytics.js";

/** Route an API request and return a Response */
export async function handleApiRoute(url: URL, req?: Request): Promise<Response> {
  const path = url.pathname;

  // GET /api/toc
  if (path === "/api/toc") {
    try {
      const toc = await loadToc();
      return json(toc);
    } catch {
      return json({ error: "TOC not found. Run the scraper first." }, 404);
    }
  }

  // GET /api/article/:guid
  const articleMatch = path.match(/^\/api\/article\/([a-zA-Z0-9_-]+)$/);
  if (articleMatch) {
    try {
      const article = await loadArticle(articleMatch[1]);
      return json(article);
    } catch (err) {
      console.error(`Error loading article ${articleMatch[1]}:`, err);
      return json({ error: "Article not found" }, 404);
    }
  }

  // GET /api/section/:guid
  const sectionMatch = path.match(/^\/api\/section\/([a-zA-Z0-9_-]+)$/);
  if (sectionMatch) {
    try {
      const guid = sectionMatch[1];
      // Search through articles to find the section
      const manifest = await loadManifest();
      for (const entry of Object.values(manifest.articles)) {
        const article = await loadArticle(entry.guid);
        const section = article.sections.find((s) => s.guid === guid);
        if (section) {
          return json({
            ...section,
            articleGuid: article.guid,
            articleTitle: article.title,
          });
        }
      }
      return json({ error: "Section not found" }, 404);
    } catch (err) {
      console.error(`Error loading section ${sectionMatch[1]}:`, err);
      return json({ error: "Section not found" }, 404);
    }
  }

  // GET /api/search?q=...
  if (path === "/api/search") {
    const q = url.searchParams.get("q") ?? "";
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const results = search(q, limit);
    return json({ query: q, count: results.length, results });
  }

  // GET /api/stats
  if (path === "/api/stats") {
    try {
      const manifest = await loadManifest();
      return json({
        municipality: manifest.municipality,
        articleCount: Object.keys(manifest.articles).length,
        sectionCount: manifest.sectionCount,
        tocNodeCount: manifest.tocNodeCount,
        indexedSections: getIndexedCount(),
        scrapedAt: manifest.scrapedAt,
        completedAt: manifest.completedAt,
      });
    } catch {
      return json({ error: "Manifest not found. Run the scraper first." }, 404);
    }
  }

  // GET /api/chat — RAG query
  if (path === "/api/chat") {
    const q = url.searchParams.get("q") ?? "";
    if (!q.trim()) {
      return json({ error: "No question provided" }, 400);
    }

    try {
      // Check prerequisites
      const ollama = await isOllamaRunning();
      if (!ollama) {
        return json({ error: "Ollama is not running. Start it with: ollama serve" }, 503);
      }
      const chroma = await isChromaRunning();
      if (!chroma) {
        return json({ error: "ChromaDB is not running. Start it with: chroma run --path chroma_data" }, 503);
      }
      const indexed = await isIndexed();
      if (!indexed) {
        return json({ error: "No documents indexed. Run: bun run index" }, 503);
      }

      console.log(`[chat] Query: ${q}`);
      const result = await ragQuery(q);
      console.log(`[chat] Answer: ${result.answer.substring(0, 100)}...`);

      return json({
        answer: result.answer,
        sources: result.sources,
        model: result.model,
      });
    } catch (err: any) {
      console.error("[chat] RAG error:", err.message);
      return json({ error: `RAG query failed: ${err.message}` }, 500);
    }
  }

  // GET /api/analytics/stats — municipal code statistics
  if (path === "/api/analytics/stats") {
    try {
      console.log("[analytics] Computing code stats...");
      const stats = await getCodeStats();
      console.log(`[analytics] Stats computed: ${stats.totalSections} sections, ${stats.totalWords} words`);
      return json(stats);
    } catch (err: any) {
      console.error("[analytics] Stats error:", err.message);
      return json({ error: `Failed to compute stats: ${err.message}` }, 500);
    }
  }

  // GET /api/analytics/embeddings — PCA projection of embeddings
  if (path === "/api/analytics/embeddings") {
    try {
      const chroma = await isChromaRunning();
      if (!chroma) {
        return json({ error: "ChromaDB is not running" }, 503);
      }
      console.log("[analytics] Computing PCA projection...");
      const projection = await getEmbeddingProjection();
      console.log(`[analytics] PCA computed: ${projection.points.length} points`);
      return json(projection);
    } catch (err: any) {
      console.error("[analytics] Embeddings error:", err.message);
      return json({ error: `Failed to compute projection: ${err.message}` }, 500);
    }
  }

  // POST /api/summarize — summarize a section using Ollama
  if (path === "/api/summarize") {
    try {
      const ollama = await isOllamaRunning();
      if (!ollama) {
        return json({ error: "Ollama is not running. Start it with: ollama serve" }, 503);
      }

      const body = req ? await req.json() : {};
      const { text, number, title } = body;
      if (!text || !text.trim()) {
        return json({ error: "No text provided to summarize" }, 400);
      }

      console.log(`[summarize] Summarizing: ${number} — ${title}`);

      const summary = await chat(
        [{ role: "user", content: `Summarize the following municipal code section comprehensively.\n\nSection: ${number}: ${title}\n\nText:\n${text.substring(0, 8000)}` }],
        "You are a legal analysis assistant specializing in municipal code. " +
        "Provide a clear, comprehensive summary that covers: " +
        "(1) Key provisions and requirements, " +
        "(2) Practical implications for residents, businesses, or developers, " +
        "(3) Enforcement mechanisms or penalties if applicable, " +
        "(4) Notable definitions or exceptions. " +
        "Be thorough but concise. Use bullet points where appropriate.",
      );

      console.log(`[summarize] Summary generated for ${number} (${summary.length} chars)`);
      return json({ summary, model: llmConfig.chatModel });
    } catch (err: any) {
      console.error("[summarize] Error:", err.message);
      return json({ error: `Summarization failed: ${err.message}` }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
