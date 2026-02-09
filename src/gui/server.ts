#!/usr/bin/env bun
/** GUI server — lightweight HTML viewer served by Bun.serve() */
import { handleApiRoute } from "./routes.js";
import { initSearch } from "./search.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const STATIC_DIR = new URL("static/", import.meta.url).pathname;

// Pre-load search index
await initSearch();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API routes
    if (url.pathname.startsWith("/api/")) {
      return handleApiRoute(url, req);
    }

    // Static files
    let filePath = `${STATIC_DIR}${url.pathname === "/" ? "index.html" : url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback
    return new Response(Bun.file(`${STATIC_DIR}index.html`));
  },
});

console.log(`Municipal Code Viewer running at http://localhost:${server.port}`);
