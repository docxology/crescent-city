/**
 * Centralized constants for the Crescent City Municipal Code project.
 *
 * All numeric constants support environment variable overrides for
 * configurable pipeline behavior without code changes.
 */

/** Helper to parse an integer env var with fallback */
function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? fallback : n;
}

// ─── Core identifiers ────────────────────────────────────────────
export const BASE_URL = "https://ecode360.com";
export const MUNICIPALITY_CODE = "CR4919";
export const OUTPUT_DIR = "output";
export const ARTICLES_DIR = "output/articles";

// ─── Scraper configuration ───────────────────────────────────────
/** Delay between page fetches (ms) — env: RATE_LIMIT_MS */
export const RATE_LIMIT_MS = envInt("RATE_LIMIT_MS", 2000);

/** Timeout for Cloudflare/page navigation (ms) — env: SCRAPE_TIMEOUT_MS */
export const SCRAPE_TIMEOUT_MS = envInt("SCRAPE_TIMEOUT_MS", 60_000);

/** Wait for Cloudflare Turnstile challenge to clear (ms) — env: CLOUDFLARE_WAIT_MS */
export const CLOUDFLARE_WAIT_MS = envInt("CLOUDFLARE_WAIT_MS", 2000);

/** Wait for SPA content render after navigation (ms) — env: SPA_RENDER_MS */
export const SPA_RENDER_MS = envInt("SPA_RENDER_MS", 1500);

/** Maximum retry attempts for failed articles — env: MAX_RETRIES */
export const MAX_RETRIES = envInt("MAX_RETRIES", 3);

// ─── Verifier configuration ─────────────────────────────────────
/** Number of random pages to re-fetch for byte comparison — env: VERIFY_SAMPLE_SIZE */
export const VERIFY_SAMPLE_SIZE = envInt("VERIFY_SAMPLE_SIZE", 5);

// ─── LLM/Embedding configuration ────────────────────────────────
/** Batch size for embedding indexing requests — env: EMBED_BATCH_SIZE */
export const EMBED_BATCH_SIZE = envInt("EMBED_BATCH_SIZE", 32);

/** Timeout for Ollama API calls (ms) — env: OLLAMA_TIMEOUT_MS */
export const OLLAMA_TIMEOUT_MS = envInt("OLLAMA_TIMEOUT_MS", 30_000);
