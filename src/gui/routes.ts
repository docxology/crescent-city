/** API route handlers for the GUI server */
import { join } from "path";
import { loadToc, loadArticle, loadSection, loadManifest, loadAllSections } from "../shared/data.js";
import { search, getIndexedCount, type PagedSearchResult } from "./search.js";
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
      return jsonWithETag(toc, req);
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
      const section = await loadSection(sectionMatch[1]);
      if (!section) return json({ error: "Section not found" }, 404);
      return json(section);
    } catch (err) {
      log.error(`Error loading section ${sectionMatch[1]}`, { error: String(err) });
      return json({ error: "Section not found" }, 404);
    }
  }

  // GET /api/search — BM25 full-text search with pagination
  if (path === "/api/search") {
    const q = url.searchParams.get("q") ?? "";
    const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "50", 10));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
    const titleFilter = url.searchParams.get("title") ?? undefined;
    const highlight = url.searchParams.get("highlight") === "true";

    const paged: PagedSearchResult = search(q, { limit, offset, titleFilter, highlight });
    return json({
      query: q,
      total: paged.total,
      offset: paged.offset,
      limit: paged.limit,
      count: paged.results.length,
      results: paged.results,
    });
  }

  // GET /api/sections — hierarchical section listing with optional title/chapter filter
  if (path === "/api/sections") {
    try {
      const titleParam = url.searchParams.get("title"); // e.g. "8"
      const chapterParam = url.searchParams.get("chapter"); // e.g. "04"
      const limitParam = Math.min(500, parseInt(url.searchParams.get("limit") ?? "100", 10));

      const all = await loadAllSections();
      let filtered = all;

      if (titleParam) {
        filtered = filtered.filter(s => {
          const num = s.number.replace(/§\s*/, "").trim();
          return num.startsWith(titleParam + ".") || num.startsWith(titleParam + " ");
        });
      }

      if (chapterParam) {
        filtered = filtered.filter(s => {
          const num = s.number.replace(/§\s*/, "").trim();
          // Match e.g. "8.04." — title.chapter prefix
          const prefix = titleParam ? `${titleParam}.${chapterParam}` : chapterParam;
          return num.startsWith(prefix + ".") || num.startsWith(prefix + " ");
        });
      }

      const page = filtered.slice(0, limitParam);
      return json({
        title: titleParam ?? null,
        chapter: chapterParam ?? null,
        total: filtered.length,
        count: page.length,
        sections: page.map(s => ({
          guid: s.guid,
          number: s.number,
          title: s.title,
          articleTitle: s.articleTitle,
          textLength: s.text.length,
        })),
      });
    } catch (err: any) {
      return json({ error: `Failed to load sections: ${err.message}` }, 500);
    }
  }

  // GET /api/stats
  if (path === "/api/stats") {
    try {
      const manifest = await loadManifest();
      const statsData = {
        municipality: manifest.municipality,
        articleCount: Object.keys(manifest.articles).length,
        sectionCount: manifest.sectionCount,
        tocNodeCount: manifest.tocNodeCount,
        indexedSections: getIndexedCount(),
        scrapedAt: manifest.scrapedAt,
        completedAt: manifest.completedAt,
      };
      return jsonWithETag(statsData, req);
    } catch {
      return json({ error: "Manifest not found. Run the scraper first." }, 404);
    }
  }

  // GET /api/stats/count — lightweight section count (no full section load)
  if (path === "/api/stats/count") {
    try {
      const manifest = await loadManifest();
      return json({ count: manifest.sectionCount });
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
  // POST /api/chat — RAG query via JSON body (for longer questions)
  if (path === "/api/chat" && req.method === "POST") {
    let body: { q?: string; context?: string } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const q = (body.q ?? "").trim();
    if (!q) return json({ error: "No question provided (field 'q' required)" }, 400);

    const llm = await getLlm();
    if (!llm) return json({ error: "LLM modules unavailable" }, 503);

    try {
      const ollama = await llm.ollama.isOllamaRunning();
      if (!ollama) return json({ error: "Ollama is not running. Start: ollama serve" }, 503);
      const chroma = await llm.chroma.isChromaRunning();
      if (!chroma) return json({ error: "ChromaDB is not running. Start: chroma run --path chroma_data" }, 503);
      const indexed = await llm.embeddings.isIndexed();
      if (!indexed) return json({ error: "No documents indexed. Run: bun run index" }, 503);

      log.info(`[chat POST] Query: ${q.substring(0, 80)}`);
      const result = await llm.rag.ragQuery(q);
      return json({ answer: result.answer, sources: result.sources, model: result.model });
    } catch (err: any) {
      log.error("[chat POST] RAG error", { error: err.message });
      return json({ error: `RAG query failed: ${err.message}` }, 500);
    }
  }


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

  // GET /api/readability — Flesch-Kincaid grade level for all sections
  if (path === "/api/readability") {
    try {
      const { existsSync } = await import("fs");
      const { readFile } = await import("fs/promises");
      if (existsSync("output/readability.json")) {
        return jsonWithETag(
          JSON.parse(await readFile("output/readability.json", "utf-8")),
          req
        );
      }
      const { scoreCorpusReadability } = await import("../shared/readability.js");
      const all = await loadAllSections();
      const scored = scoreCorpusReadability(all);
      const avg = scored.length > 0
        ? Math.round(scored.reduce((s, r) => s + r.score.gradeLevel, 0) / scored.length * 10) / 10
        : 0;
      const payload = {
        computedAt: new Date().toISOString(),
        totalSections: all.length,
        scored: scored.length,
        averageGradeLevel: avg,
        hardestSections: scored.slice(0, 10),
        easiestSections: scored.slice(-10).reverse(),
      };
      return jsonWithETag(payload, req);
    } catch (err: any) {
      return json({ error: `Readability scoring failed: ${err.message}` }, 500);
    }
  }

  // GET /api/domains/coverage — domain cross-reference coverage metrics
  if (path === "/api/domains/coverage") {
    try {
      const { existsSync } = await import("fs");
      const { readFile } = await import("fs/promises");
      if (existsSync("output/domain-coverage.json")) {
        return jsonWithETag(
          JSON.parse(await readFile("output/domain-coverage.json", "utf-8")),
          req
        );
      }
      const { computeDomainCoverage } = await import("../domains/coverage.js");
      return jsonWithETag(await computeDomainCoverage(), req);
    } catch (err: any) {
      return json({ error: `Coverage computation failed: ${err.message}` }, 500);
    }
  }

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

  // GET /api/toc/breadcrumb?guid=... — return full ancestry path for a TOC node
  if (path === "/api/toc/breadcrumb") {
    const guid = url.searchParams.get("guid") ?? "";
    if (!guid.trim()) return json({ error: "No guid provided" }, 400);
    try {
      const toc = await loadToc();

      type Crumb = { guid: string; title: string; type: string; level: number };

      /** Recursively find the path from root to target guid */
      function findPath(
        nodes: any[],
        targetGuid: string,
        path: Crumb[],
        level: number
      ): Crumb[] | null {
        for (const node of nodes) {
          const current: Crumb = {
            guid: node.guid ?? node.id ?? "",
            title: node.title ?? node.label ?? "(untitled)",
            type: node.type ?? "node",
            level,
          };
          if (current.guid === targetGuid) return [...path, current];
          if (node.children?.length > 0) {
            const found = findPath(node.children, targetGuid, [...path, current], level + 1);
            if (found) return found;
          }
        }
        return null;
      }

      const rootNodes = Array.isArray(toc) ? toc : (toc.children ?? [toc]);
      const breadcrumb = findPath(rootNodes, guid, [], 0);

      if (!breadcrumb) {
        return json({ error: `GUID "${guid}" not found in TOC` }, 404);
      }

      return json({ guid, breadcrumb, depth: breadcrumb.length });
    } catch (err: any) {
      return json({ error: `TOC breadcrumb failed: ${err.message}` }, 500);
    }
  }

  // GET /api/domain/:id/search?q=... — BM25 search scoped to a domain's sections
  const domainSearchMatch = path.match(/^\/api\/domain\/([a-z-]+)\/search$/);
  if (domainSearchMatch) {
    const q = url.searchParams.get("q") ?? "";
    if (!q.trim()) return json({ error: "No query provided" }, 400);
    const domainId = domainSearchMatch[1];
    const { getDomainById } = await import("../domains.js");
    const domain = getDomainById(domainId);
    if (!domain) return json({ error: `Domain "${domainId}" not found` }, 404);

    // Build allowlist of section number prefixes from domain topic sources
    const sectionPrefixes = new Set<string>(
      domain.topics.flatMap(t =>
        t.sources.map(s => s.sectionNumber.replace(/[§\s]/g, "").trim())
      )
    );

    // Run BM25 search then filter to domain sections
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10));
    const highlight = url.searchParams.get("highlight") === "true";
    const paged = search(q, { limit: 500, highlight });

    // Filter results to those whose section number matches a domain source prefix
    const domainResults = paged.results.filter(r => {
      const num = r.section.number.replace(/[§\s]/g, "").trim();
      return [...sectionPrefixes].some(p => num.startsWith(p.split(".").slice(0, 2).join(".")));
    }).slice(0, limit);

    return json({
      domain: domainId,
      query: q,
      total: domainResults.length,
      results: domainResults,
    });
  }

  // GET /api/domain/:id/sections — cross-reference domain topics to code sections
  const domainSectionsMatch = path.match(/^\/api\/domain\/([a-z-]+)\/sections$/);
  if (domainSectionsMatch) {
    const { getDomainById } = await import("../domains.js");
    const domain = getDomainById(domainSectionsMatch[1]);
    if (!domain) return json({ error: `Domain "${domainSectionsMatch[1]}" not found` }, 404);

    // Gather all unique section numbers referenced by this domain's topics
    const sectionNumbers = new Set<string>();
    for (const topic of domain.topics) {
      for (const src of topic.sources) sectionNumbers.add(src.sectionNumber);
    }

    // Build a cross-reference map: sectionNumber → topics that reference it
    const xref: Array<{ sectionNumber: string; topics: string[]; relevance: string[] }> = [];
    for (const num of [...sectionNumbers].sort()) {
      const refs = domain.topics.flatMap(t =>
        t.sources
          .filter(s => s.sectionNumber === num)
          .map(s => ({ topic: t.name, relevance: s.relevance }))
      );
      xref.push({
        sectionNumber: num,
        topics: refs.map(r => r.topic),
        relevance: refs.map(r => r.relevance),
      });
    }

    return json({
      domainId: domain.id,
      domainName: domain.name,
      sectionCount: sectionNumbers.size,
      crossReferences: xref,
    });
  }

  // GET /api/monitor/status — last change-detection report
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

  // GET /api/monitor/history — historical monitor runs (appended JSONL)
  if (path === "/api/monitor/history") {
    try {
      const { readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const histPath = "output/monitor-history.jsonl";
      if (!existsSync(histPath)) return json({ history: [], count: 0 });

      const raw = await readFile(histPath, "utf-8");
      const history = raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .reverse(); // most recent first

      const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10));
      return json({ history: history.slice(0, limit), count: history.length });
    } catch (err: any) {
      return json({ error: `Failed to read monitor history: ${err.message}` }, 500);
    }
  }

  // GET /api/monitor/alerts — latest entry from each alert monitor
  if (path === "/api/monitor/alerts") {
    const { existsSync } = await import("fs");
    const { readdir, readFile } = await import("fs/promises");
    const alertTypes = ["tsunami", "earthquake", "weather", "tides", "fishing"];
    const alerts: Record<string, unknown> = {};

    for (const type of alertTypes) {
      const dir = `output/alerts/${type}`;
      const tidesDir = `output/${type === "tides" ? "tides" : type === "fishing" ? "fishing" : "alerts/" + type}`;
      const searchDir = type === "tides" ? "output/tides" : type === "fishing" ? "output/fishing" : dir;
      if (!existsSync(searchDir)) { alerts[type] = null; continue; }
      try {
        const files = (await readdir(searchDir))
          .filter(f => f.endsWith(".json"))
          .sort()
          .reverse();
        if (files.length === 0) { alerts[type] = null; continue; }
        alerts[type] = JSON.parse(await readFile(`${searchDir}/${files[0]}`, "utf-8"));
      } catch {
        alerts[type] = null;
      }
    }

    return json({ fetchedAt: new Date().toISOString(), alerts });
  }

  // GET /api/openapi.yaml — OpenAPI specification
  if (path === "/api/openapi.yaml") {
    try {
      const { readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const specPath = join(process.cwd(), "openapi.yaml");
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

  // GET /api/health — liveness probe
  if (path === "/api/health") {
    return json({ status: "ok", timestamp: new Date().toISOString() });
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


/** Compute a short hash-based ETag for a JSON payload */
export function etag(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = Math.imul(31, hash) + payload.charCodeAt(i) | 0;
  }
  return `"${(hash >>> 0).toString(16)}"`;
}

/** Return JSON response with ETag and optional 304 shortcircuit for static endpoints */
export function jsonWithETag(data: unknown, req: Request | undefined, status = 200): Response {
  const payload = JSON.stringify(data);
  const tag = etag(payload);
  const ifNoneMatch = req?.headers.get("If-None-Match");
  if (ifNoneMatch === tag) {
    return new Response(null, {
      status: 304,
      headers: { "ETag": tag, "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" },
    });
  }
  return new Response(payload, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "ETag": tag,
      "Vary": "Accept-Encoding",
      "Cache-Control": "public, max-age=60",
    },
  });
}
