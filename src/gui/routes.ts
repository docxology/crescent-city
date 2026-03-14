/** API route handlers for the GUI server */
import { loadToc, loadArticle, loadManifest } from "../shared/data.js";
import { search, getIndexedCount } from "./search.js";
import { createLogger } from "../logger.js";
import { llmConfig } from "../llm/config.js";

const log = createLogger("routes");

// ─── Dynamic LLM imports (graceful degradation) ─────────────────

/** Lazily load LLM modules — returns null if dependencies are unavailable */
async function loadLlmModules() {
  try {
    const [rag, ollama, chroma, embeddings, analytics] = await Promise.all([
      import("../llm/rag.js"),
      import("../llm/ollama.js"),
      import("../llm/chroma.js"),
      import("../llm/embeddings.js"),
      import("./analytics.js"),
    ]);
    return { rag, ollama, chroma, embeddings, analytics };
  } catch (err: any) {
    log.warn("LLM modules unavailable — chat/analytics/summarize disabled", { error: err.message });
    return null;
  }
}

let llmModules: Awaited<ReturnType<typeof loadLlmModules>> = null;
let llmModulesLoaded = false;

/** Get LLM modules, loading once lazily */
async function getLlm() {
  if (!llmModulesLoaded) {
    llmModules = await loadLlmModules();
    llmModulesLoaded = true;
  }
  return llmModules;
}

// ─── Route handler ───────────────────────────────────────────────

/** Route an API request and return a Response */
export async function handleApiRoute(url: URL, req?: Request): Promise<Response> {
  const path = url.pathname;
  const start = performance.now();

  let response: Response;
  try {
    response = await routeRequest(path, url, req);
  } catch (err: any) {
    log.error(`Unhandled error on ${path}`, { error: err.message });
    response = json({ error: "Internal server error" }, 500);
  }

  const ms = (performance.now() - start).toFixed(1);
  log.debug(`${path} -> ${response.status} (${ms}ms)`);
  return response;
}

async function routeRequest(path: string, url: URL, req?: Request): Promise<Response> {
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
      log.error(`Error loading article ${articleMatch[1]}`, { error: String(err) });
      return json({ error: "Article not found" }, 404);
    }
  }

  // GET /api/section/:guid
  const sectionMatch = path.match(/^\/api\/section\/([a-zA-Z0-9_-]+)$/);
  if (sectionMatch) {
    try {
      const guid = sectionMatch[1];
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
      log.error(`Error loading section ${sectionMatch[1]}`, { error: String(err) });
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

  // ─── LLM-dependent routes ────────────────────────────────────

  // GET /api/chat — RAG query
  if (path === "/api/chat") {
    const q = url.searchParams.get("q") ?? "";
    if (!q.trim()) {
      return json({ error: "No question provided" }, 400);
    }

    const llm = await getLlm();
    if (!llm) {
      return json({ error: "LLM modules unavailable. Install chromadb package and restart." }, 503);
    }

    try {
      const ollama = await llm.ollama.isOllamaRunning();
      if (!ollama) {
        return json({ error: "Ollama is not running. Start it with: ollama serve" }, 503);
      }
      const chroma = await llm.chroma.isChromaRunning();
      if (!chroma) {
        return json({ error: "ChromaDB is not running. Start it with: chroma run --path chroma_data" }, 503);
      }
      const indexed = await llm.embeddings.isIndexed();
      if (!indexed) {
        return json({ error: "No documents indexed. Run: bun run index" }, 503);
      }

      log.info(`[chat] Query: ${q}`);
      const result = await llm.rag.ragQuery(q);
      log.info(`[chat] Answer: ${result.answer.substring(0, 100)}...`);

      return json({
        answer: result.answer,
        sources: result.sources,
        model: result.model,
      });
    } catch (err: any) {
      log.error("[chat] RAG error", { error: err.message });
      return json({ error: `RAG query failed: ${err.message}` }, 500);
    }
  }

  // GET /api/analytics/stats — municipal code statistics
  if (path === "/api/analytics/stats") {
    const llm = await getLlm();
    if (!llm) {
      return json({ error: "Analytics modules unavailable" }, 503);
    }
    try {
      log.info("[analytics] Computing code stats...");
      const stats = await llm.analytics.getCodeStats();
      log.info(`[analytics] Stats computed: ${stats.totalSections} sections, ${stats.totalWords} words`);
      return json(stats);
    } catch (err: any) {
      log.error("[analytics] Stats error", { error: err.message });
      return json({ error: `Failed to compute stats: ${err.message}` }, 500);
    }
  }

  // GET /api/analytics/embeddings — PCA projection
  if (path === "/api/analytics/embeddings") {
    const llm = await getLlm();
    if (!llm) {
      return json({ error: "Analytics modules unavailable" }, 503);
    }
    try {
      const chroma = await llm.chroma.isChromaRunning();
      if (!chroma) {
        return json({ error: "ChromaDB is not running" }, 503);
      }
      log.info("[analytics] Computing PCA projection...");
      const projection = await llm.analytics.getEmbeddingProjection();
      log.info(`[analytics] PCA computed: ${projection.points.length} points`);
      return json(projection);
    } catch (err: any) {
      log.error("[analytics] Embeddings error", { error: err.message });
      return json({ error: `Failed to compute projection: ${err.message}` }, 500);
    }
  }

  // POST /api/summarize — summarize a section using Ollama
  if (path === "/api/summarize") {
    const llm = await getLlm();
    if (!llm) {
      return json({ error: "LLM modules unavailable" }, 503);
    }
    try {
      const ollama = await llm.ollama.isOllamaRunning();
      if (!ollama) {
        return json({ error: "Ollama is not running. Start it with: ollama serve" }, 503);
      }

      const body = req ? await req.json() : {};
      const { text, number, title } = body;
      if (!text || !text.trim()) {
        return json({ error: "No text provided to summarize" }, 400);
      }

      log.info(`[summarize] Summarizing: ${number} — ${title}`);

      const summary = await llm.ollama.chat(
        [{ role: "user", content: `Summarize the following municipal code section comprehensively.\n\nSection: ${number}: ${title}\n\nText:\n${text.substring(0, 8000)}` }],
        "You are a legal analysis assistant specializing in municipal code. " +
        "Provide a clear, comprehensive summary that covers: " +
        "(1) Key provisions and requirements, " +
        "(2) Practical implications for residents, businesses, or developers, " +
        "(3) Enforcement mechanisms or penalties if applicable, " +
        "(4) Notable definitions or exceptions. " +
        "Be thorough but concise. Use bullet points where appropriate.",
      );

      log.info(`[summarize] Summary generated for ${number} (${summary.length} chars)`);
      return json({ summary, model: llmConfig.chatModel });
    } catch (err: any) {
      log.error("[summarize] Error", { error: err.message });
      return json({ error: `Summarization failed: ${err.message}` }, 500);
    }
  }

  // ─── Intelligence Domain routes ──────────────────────────────

  // GET /api/domains — list all intelligence domains
  if (path === "/api/domains") {
    const { getDomainSummaries } = await import("../domains.js");
    return json(getDomainSummaries());
  }

  // GET /api/domain/:id — get a specific domain with all topics
  const domainMatch = path.match(/^\/api\/domain\/([a-z-]+)$/);
  if (domainMatch) {
    const { getDomainById } = await import("../domains.js");
    const domain = getDomainById(domainMatch[1]);
    if (!domain) {
      return json({ error: `Domain "${domainMatch[1]}" not found` }, 404);
    }
    return json(domain);
  }

  // GET /api/domains/search?q=... — search across domains
  if (path === "/api/domains/search") {
    const q = url.searchParams.get("q") ?? "";
    if (!q.trim()) return json({ error: "No query" }, 400);
    const { searchDomains } = await import("../domains.js");
    const results = searchDomains(q);
    return json({ query: q, count: results.length, domains: results });
  }

  // GET /api/monitor/status — last monitoring report
  if (path === "/api/monitor/status") {
    try {
      const { readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const reportPath = "output/monitor-report.json";
      if (!existsSync(reportPath)) {
        return json({ error: "No monitor report. Run: bun run monitor" }, 404);
      }
      const report = JSON.parse(await readFile(reportPath, "utf-8"));
      return json(report);
    } catch (err: any) {
      return json({ error: `Failed to read monitor report: ${err.message}` }, 500);
    }
  }

  // GET /api/openapi.yaml — OpenAPI specification
  if (path === "/api/openapi.yaml") {
    try {
      const { readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const specPath = "../openapi.yaml";
      if (!existsSync(specPath)) {
        return json({ error: "OpenAPI specification not found" }, 404);
      }
      const spec = await readFile(specPath, "utf-8");
      return new Response(spec, {
        headers: {
          "Content-Type": "application/yaml",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err: any) {
      return json({ error: `Failed to read OpenAPI specification: ${err.message}` }, 500);
    }
  }

  // GET /api/docs — Swagger UI
  if (path === "/api/docs" || path === "/api/docs/") {
    try {
      const { readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const htmlPath = new URL("./static/docs.html", import.meta.url).pathname;
      if (!existsSync(htmlPath)) {
        return json({ error: "Swagger UI not found" }, 404);
      }
      const html = await readFile(htmlPath, "utf-8");
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err: any) {
      return json({ error: `Failed to serve Swagger UI: ${err.message}` }, 500);
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

