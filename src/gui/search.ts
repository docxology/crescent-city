/**
 * In-memory BM25 full-text search engine for municipal code sections.
 *
 * Ranking formula: BM25 with field-weighted index.
 * - Section number prefix match: heavy boost (×20)
 * - Title matches: 3× weight boost
 * - Body text: standard BM25 scoring
 *
 * Additional features:
 * - Stop word filtering (42 legal/English stop words removed from index)
 * - Synonym expansion (28 CA municipal law synonym pairs at query time)
 * - Snippet extraction with `<mark>` HTML highlighting
 * - Title filter: ?title=8 scopes to sections starting with "8."
 * - Pagination: offset + limit parameters
 * - Multi-term queries: each whitespace-separated token scored independently
 */
import type { FlatSection, SearchResult } from "../types.js";
import { loadAllSections } from "../shared/data.js";
import { createLogger } from "../logger.js";
import { stem } from "../shared/porter_stem.js";

const logger = createLogger("search");

// ─── BM25 constants ───────────────────────────────────────────────
const K1 = 1.5;  // Term frequency saturation
const B = 0.75;  // Length normalization factor

// ─── Legal stop words ────────────────────────────────────────────
/**
 * High-frequency words that should NOT be indexed — they appear in nearly
 * every section and provide zero discriminative signal in BM25 ranking.
 * Includes both English function words and common legal boilerplate.
 */
export const LEGAL_STOP_WORDS = new Set([
  // English function words
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "this", "that", "these", "those", "it", "its",
  "not", "no", "as", "if", "when", "which", "who", "any", "all", "each",
  // Legal boilerplate (appears in virtually every section)
  "shall", "herein", "thereof", "thereto", "therein", "hereby",
  "pursuant", "notwithstanding", "provided", "section", "code",
  "ordinance", "city", "crescent",
]);

// ─── CA Municipal Law Synonyms ────────────────────────────────────
/**
 * Synonym expansion map for California municipal law terminology.
 * At query time, each term is expanded to include all its synonyms
 * (and vice versa), improving recall across drafting styles.
 *
 * Format: term → canonical form (all synonyms map to the same canonical
 * form so BM25 scoring uses the indexed token variant).
 */
export const SYNONYMS: Map<string, string[]> = new Map([
  // Land use
  ["parcel",    ["lot", "plot", "tract"]],
  ["lot",       ["parcel", "plot", "tract"]],
  ["structure", ["building", "facility"]],
  ["building",  ["structure", "facility"]],
  ["dwelling",  ["residence", "home", "house"]],
  ["residence", ["dwelling", "home", "house"]],
  ["setback",   ["offset", "clearance"]],
  // Coastal & harbor
  ["harbor",    ["port", "marina", "wharf"]],
  ["port",      ["harbor", "marina", "wharf"]],
  ["vessel",    ["boat", "ship", "watercraft"]],
  ["boat",      ["vessel", "ship", "watercraft"]],
  // Legal / administrative
  ["permit",    ["license", "authorization", "approval"]],
  ["license",   ["permit", "authorization", "approval"]],
  ["variance",  ["exception", "waiver", "deviation"]],
  ["appeal",    ["petition", "challenge", "objection"]],
  ["fee",       ["charge", "assessment", "rate"]],
  ["fine",      ["penalty", "forfeiture", "sanction"]],
  ["violation", ["offense", "infraction", "breach"]],
  // Emergency
  ["evacuation", ["withdrawal", "egress", "escape"]],
  ["tsunami",    ["tidal wave", "seismic sea wave"]],
  ["earthquake", ["seismic", "temblor", "tremor"]],
  // Infrastructure
  ["road",      ["street", "avenue", "boulevard", "drive", "way"]],
  ["street",    ["road", "avenue", "boulevard", "lane"]],
  ["utilities", ["services", "water", "sewer", "electric"]],
  ["storm",     ["stormwater", "drainage", "runoff"]],
]);

/** Expand a single raw token using synonym map (returns token + all synonyms) */
function expandSynonyms(token: string): string[] {
  const alts = SYNONYMS.get(token) ?? [];
  return [token, ...alts];
}

// ─── Index state ─────────────────────────────────────────────────
let sections: FlatSection[] = [];
let loaded = false;

/** Per-section term frequency index: sectionIdx → term → {tf, titleTf, numberMatch} */
let tfIndex: Array<Map<string, { tf: number; titleTf: number }>> = [];
/** Inverse document frequency map: term → idf */
let idfIndex = new Map<string, number>();
/** Average body length (in tokens) */
let avgBodyLen = 1;

// ─── Tokenizer ────────────────────────────────────────────────────

// ─── Stemmer exceptions ──────────────────────────────────────────
/**
 * Terms that must NOT be stemmed because they have distinct legal meanings
 * from their morphological root. Porter stemmer would conflate these:
 *
 * - "planning" → "plan"  (Planning Commission ≠ generic plan)
 * - "zoning" → "zone"    (Zoning Code ≠ geographic zone)
 * - "housing" → "hous"   (Housing Authority ≠ to house)
 * - "fishing" → "fish"   (Fishing license ≠ fish species)
 * - "parking" → "park"   (Parking ordinance ≠ park/parks)
 * - "building" → "build" (Building permit ≠ to build)
 * - "hearing" → "hear"   (Public hearing ≠ to hear)
 * - "grading" → "grad"   (Site grading ≠ academic grade)
 * - "banning" → "ban"    (City of Banning ≠ to ban)
 */
export const STEMMER_EXCEPTIONS = new Set([
  "planning", "zoning", "housing", "fishing", "parking",
  "building", "hearing", "grading", "banning", "granting",
  "licensing", "permitting", "appealing", "mapping",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !LEGAL_STOP_WORDS.has(t));
}

/** Tokenize and stem using Porter algorithm (for index building) */
function tokenizeAndStem(text: string): string[] {
  return tokenize(text).map(t => STEMMER_EXCEPTIONS.has(t) ? t : stem(t));
}

/**
 * Return union of raw, stemmed, and synonym-expanded tokens for query.
 * Stop words are excluded. Synonyms are added for recall.
 */
function queryTerms(text: string): string[] {
  const raw = tokenize(text);
  const expanded: string[] = [];
  for (const t of raw) {
    expanded.push(...expandSynonyms(t));
  }
  // Filter stop words from expansions too, then stem all
  const filtered = expanded.filter(t => !LEGAL_STOP_WORDS.has(t));
  const stemmed = filtered.map(stem);
  const combined = new Set([...filtered, ...stemmed]);
  return [...combined];
}

// ─── Index building ───────────────────────────────────────────────

function buildIndex(allSections: FlatSection[]): void {
  const N = allSections.length;
  tfIndex = [];
  idfIndex = new Map();
  let totalBodyLen = 0;

  // Build per-doc TF maps using stemmed tokens
  const docFreq = new Map<string, number>(); // term → # docs containing it

  for (const section of allSections) {
    const bodyTokens = tokenizeAndStem(section.text);
    const titleTokens = tokenizeAndStem(section.title);
    totalBodyLen += bodyTokens.length;

    const termMap = new Map<string, { tf: number; titleTf: number }>();

    for (const t of bodyTokens) {
      const entry = termMap.get(t) ?? { tf: 0, titleTf: 0 };
      entry.tf++;
      termMap.set(t, entry);
    }

    for (const t of titleTokens) {
      const entry = termMap.get(t) ?? { tf: 0, titleTf: 0 };
      entry.titleTf++;
      termMap.set(t, entry);
    }

    // Count document frequency
    for (const term of termMap.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }

    tfIndex.push(termMap);
  }

  avgBodyLen = N > 0 ? totalBodyLen / N : 1;

  // Compute IDF: ln((N - df + 0.5) / (df + 0.5) + 1)
  for (const [term, df] of docFreq) {
    idfIndex.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  logger.info(`Search index built: ${N} sections, ${idfIndex.size} unique terms`);
}

// ─── Init ─────────────────────────────────────────────────────────

/** Load + index all sections. Idempotent. */
export async function initSearch(): Promise<void> {
  if (loaded) return;
  sections = await loadAllSections();
  buildIndex(sections);
  loaded = true;
}

/** Force a reload of the search index (after a re-scrape). */
export async function reloadSearch(): Promise<void> {
  loaded = false;
  await initSearch();
}

// ─── Scoring ─────────────────────────────────────────────────────

function bm25Score(
  terms: string[],
  sectionIdx: number,
  bodyLen: number
): number {
  const termMap = tfIndex[sectionIdx];
  let score = 0;

  for (const term of terms) {
    const idf = idfIndex.get(term) ?? 0;
    const entry = termMap.get(term);
    if (!entry) continue;

    // BM25 for body
    const tf = entry.tf;
    const bodyScore =
      idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (bodyLen / avgBodyLen))));

    // Title boost: treat title matches as 3× more relevant (added directly to score)
    const titleScore = idf * entry.titleTf * 3;

    score += bodyScore + titleScore;
  }

  return score;
}

// ─── Snippet extraction ───────────────────────────────────────────

/**
 * Extract a short snippet around the first term match.
 * If highlight=true, wraps the exact query text with <mark> tags.
 */
function extractSnippet(text: string, query: string, highlight = false): string {
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = lower.indexOf(queryLower);

  let snippet: string;
  if (idx === -1) {
    snippet = text.substring(0, 200).trim();
  } else {
    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + query.length + 120);
    snippet =
      (start > 0 ? "…" : "") +
      text.slice(start, end).trim() +
      (end < text.length ? "…" : "");
  }

  if (highlight && idx !== -1) {
    // Escape any existing HTML in snippet, then wrap matches with <mark>
    const escaped = snippet.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const re = new RegExp(queryLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return escaped.replace(re, m => `<mark>${m}</mark>`);
  }

  return snippet;
}

// ─── Public API ───────────────────────────────────────────────────

export interface SearchOptions {
  /** Maximum results to return (default 50) */
  limit?: number;
  /** Skip this many results (for pagination) */
  offset?: number;
  /** Filter to sections whose number starts with this title (e.g., "8" for Title 8) */
  titleFilter?: string;
  /** Wrap matched text in <mark> tags in snippets */
  highlight?: boolean;
  /** Filter by node type: 'article' (section is the article container) or 'section' (individual section) */
  typeFilter?: "article" | "section";
}

export interface PagedSearchResult {
  results: SearchResult[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Search sections using BM25 ranking.
 *
 * @param query - User query string (whitespace-separated terms)
 * @param options - Pagination, filters, highlighting
 */
export function search(query: string, options: SearchOptions = {}): PagedSearchResult {
  const { limit = 50, offset = 0, titleFilter, highlight = false, typeFilter } = options;

  if (!query.trim()) return { results: [], total: 0, offset, limit };

  const terms = queryTerms(query); // raw + stemmed union
  const rawQuery = query.trim();

  const scored: Array<{ idx: number; score: number }> = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Title filter (e.g., "8" matches sections like "§ 8.04.010")
    if (titleFilter) {
      const num = section.number.replace(/§\s*/, "").trim();
      if (!num.startsWith(titleFilter + ".") && !num.startsWith(titleFilter + " ")) continue;
    }

    // Type filter: 'article' = whole-article sections, 'section' = individual sections
    if (typeFilter === "article") {
      // "Article-level" sections are those where number has at most 2 segments (e.g., "8.04")
      const num = section.number.replace(/§\s*/, "").trim();
      const segments = num.split(".").length;
      if (segments > 2) continue;
    } else if (typeFilter === "section") {
      // Individual sections have 3+ segments (e.g., "8.04.010")
      const num = section.number.replace(/§\s*/, "").trim();
      const segments = num.split(".").length;
      if (segments < 3) continue;
    }

    // Heavy boost for section number prefix match
    const numberClean = section.number.replace(/§\s*/, "").trim().toLowerCase();
    let score = bm25Score(terms, i, tokenizeAndStem(section.text).length);

    if (numberClean.startsWith(rawQuery.toLowerCase())) score += 20;

    if (score > 0) scored.push({ idx: i, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const total = scored.length;
  const page = scored.slice(offset, offset + limit);

  const results: SearchResult[] = page.map(({ idx, score }) => {
    const section = sections[idx];
    const snippet = extractSnippet(section.text || section.title, rawQuery, highlight);
    return { section, snippet, matchCount: Math.round(score * 100) / 100 };
  });

  return { results, total, offset, limit };
}

/** Backward-compatible default export for single-arg usage */
export function searchSimple(query: string, limit = 50): SearchResult[] {
  return search(query, { limit }).results;
}

/** Total indexed sections */
export function getIndexedCount(): number {
  return sections.length;
}
