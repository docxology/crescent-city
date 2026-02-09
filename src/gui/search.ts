/** In-memory full-text search engine for municipal code sections */
import type { FlatSection, SearchResult } from "../types.js";
import { loadAllSections } from "../shared/data.js";

let sections: FlatSection[] = [];
let loaded = false;

/** Load all sections into memory for fast searching */
export async function initSearch(): Promise<void> {
  if (loaded) return;
  sections = await loadAllSections();
  loaded = true;
  console.log(`Search index loaded: ${sections.length} sections`);
}

/** Search sections by query string. Supports substring and section number prefix matching. */
export function search(query: string, limit = 50): SearchResult[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase().trim();

  const results: SearchResult[] = [];

  for (const section of sections) {
    let matchCount = 0;
    let snippet = "";

    // Check section number prefix match (e.g., "12.04")
    const numberClean = section.number.replace(/§\s*/, "").trim().toLowerCase();
    if (numberClean.startsWith(lower)) {
      matchCount += 10; // Boost number prefix matches
      snippet = section.title;
    }

    // Check title match
    const titleLower = section.title.toLowerCase();
    if (titleLower.includes(lower)) {
      matchCount += 5;
      snippet = section.title;
    }

    // Check text match
    const textLower = section.text.toLowerCase();
    const idx = textLower.indexOf(lower);
    if (idx !== -1) {
      matchCount += 1;
      // Count all occurrences
      let pos = 0;
      while ((pos = textLower.indexOf(lower, pos)) !== -1) {
        matchCount++;
        pos += lower.length;
      }
      // Extract context snippet
      const start = Math.max(0, idx - 80);
      const end = Math.min(section.text.length, idx + lower.length + 80);
      snippet = (start > 0 ? "..." : "") +
        section.text.slice(start, end).trim() +
        (end < section.text.length ? "..." : "");
    }

    if (matchCount > 0) {
      results.push({ section, snippet, matchCount });
    }
  }

  // Sort by match count descending
  results.sort((a, b) => b.matchCount - a.matchCount);
  return results.slice(0, limit);
}

/** Get the total number of indexed sections */
export function getIndexedCount(): number {
  return sections.length;
}
