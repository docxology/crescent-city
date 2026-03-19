/** Shared utility functions */
import type { TocNode } from "./types.js";

// ─── Crypto ──────────────────────────────────────────────────────

/** Compute SHA-256 hash of a string, returned as a 64-char hex string */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── TOC / Array utilities ────────────────────────────────────────

/** Flatten a TOC tree into a list of all nodes (depth-first) */
export function flattenToc(node: TocNode): TocNode[] {
  const result: TocNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenToc(child));
  }
  return result;
}

/** Fisher-Yates in-place shuffle (returns a new array, original unchanged) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Chunk an array into sub-arrays of a given size.
 * @example chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Group an array of objects by a key extracted from each element.
 * @example groupBy([{a:1},{a:1},{a:2}], x => String(x.a)) → { '1': [...], '2': [...] }
 */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}

/** Deduplicate an array by a key function */
export function uniqBy<T>(arr: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Text processing ─────────────────────────────────────────────

/** Convert HTML to plain text with basic formatting preservation */
export function htmlToText(html: string): string {
  return html
    .replace(/<div class="para[^"]*">/g, "\n")
    .replace(/<div class="history">/g, "\n[History: ")
    .replace(/<span class="loclaw">/g, "")
    .replace(/<\/span>/g, "")
    .replace(/<\/div>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Truncate text to a maximum length, appending an ellipsis if trimmed.
 * Truncates at a word boundary when possible.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const trimmed = text.substring(0, maxLength);
  // Try to cut at the last space to avoid mid-word truncation
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? trimmed.substring(0, lastSpace) : trimmed) + "…";
}

/** Count words in a string (splits on whitespace) */
export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

/**
 * Extract a short snippet around the first occurrence of a query in text.
 * Returns up to `windowChars` characters centered on the match.
 */
export function extractSnippet(text: string, query: string, windowChars = 200): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return truncateText(text, windowChars);
  const start = Math.max(0, idx - windowChars / 2);
  const end = Math.min(text.length, idx + query.length + windowChars / 2);
  const snippet = text.substring(start, end).trim();
  return (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "");
}

/**
 * Format a byte count as a human-readable string.
 * @example formatBytes(1536) → "1.5 KB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── CSV ─────────────────────────────────────────────────────────

/** Escape a value for CSV output (quotes if contains comma, quote, or newline) */
export function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ─── Filesystem ──────────────────────────────────────────────────

/** Sanitize a string for use as a filename (replaces non-alphanumeric, max 80 chars) */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 80);
}

// ─── Async helpers ───────────────────────────────────────────────

/** Sleep for `ms` milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async function up to `maxAttempts` times with exponential backoff.
 * @param fn - The async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param baseDelayMs - Initial delay in ms, doubles each retry (default: 1000)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastError;
}

// ─── Object utilities ────────────────────────────────────────────

/** Deep equality check for plain JSON-serializable objects */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a === null || b === null) return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
}

/** Pick a subset of keys from an object */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) result[k] = obj[k];
  }
  return result;
}

/** Omit a subset of keys from an object */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const k of keys) {
    delete result[k];
  }
  return result as Omit<T, K>;
}

// ─── Unicode / Text normalization ────────────────────────────────

/**
 * Normalize Unicode typographic characters found in scraped legal text
 * to their plain ASCII equivalents.
 *
 * Covers smart quotes, em/en dashes, non-breaking spaces, ellipsis,
 * and common ligatures (fi, fl, ff, etc.). The section sign (§) is
 * preserved — it is semantically meaningful in legal text.
 *
 * Safe to call multiple times (idempotent).
 */
export function normalizeText(text: string): string {
  return text
    // Smart quotes → straight
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    // Dashes → hyphen-minus
    .replace(/[\u2013\u2014\u2015\u2212]/g, "-")
    // Non-breaking spaces / thin spaces → regular space
    .replace(/[\u00A0\u202F\u2009\u2007\u2008\u200B]/g, " ")
    // Ellipsis → three periods
    .replace(/\u2026/g, "...")
    // Common ligatures → plain letters
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl")
    .replace(/[\uFB05\uFB06]/g, "st")
    // Collapse multiple spaces
    .replace(/ {2,}/g, " ");
}

// ─── Data quality ─────────────────────────────────────────────────

export interface SectionLengthOutlier {
  guid: string;
  number: string;
  title: string;
  wordCount: number;
  reason: "too_short" | "too_long";
}

/**
 * Flag sections that are suspiciously short (<25 words) or long (>5,000 words).
 *
 * Short sections (<25 words) may indicate HTML extraction failures where only
 * a label or heading was captured. Long sections (>5,000 words) may indicate
 * concatenation errors where multiple sections were merged into one during scraping.
 *
 * @param sections - Sections to check
 * @param minWords - Minimum expected word count (default: 25)
 * @param maxWords - Maximum expected word count (default: 5000)
 */
export function checkSectionLengthOutliers(
  sections: Array<{ guid: string; number: string; title: string; text: string }>,
  minWords = 25,
  maxWords = 5000
): SectionLengthOutlier[] {
  const outliers: SectionLengthOutlier[] = [];
  for (const s of sections) {
    const wc = countWords(s.text);
    if (wc < minWords) {
      outliers.push({ guid: s.guid, number: s.number, title: s.title, wordCount: wc, reason: "too_short" });
    } else if (wc > maxWords) {
      outliers.push({ guid: s.guid, number: s.number, title: s.title, wordCount: wc, reason: "too_long" });
    }
  }
  return outliers.sort((a, b) => a.wordCount - b.wordCount);
}

