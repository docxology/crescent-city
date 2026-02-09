/**
 * Table of Contents fetcher.
 * Retrieves and parses the full TOC tree from the ecode360 API.
 */
import type { Page } from "playwright";
import type { TocNode } from "./types.js";
import { navigateWithCloudflare } from "./browser.js";
import { BASE_URL, MUNICIPALITY_CODE } from "./constants.js";
import { flattenToc } from "./utils.js";

/**
 * Fetch the complete table of contents by navigating to the code page
 * and intercepting the /toc/CR4919 API response.
 */
export async function fetchToc(page: Page): Promise<TocNode> {
  let tocData: TocNode | null = null;

  // Intercept the TOC API call that the page makes
  const tocPromise = page.waitForResponse(
    (resp) => resp.url().includes(`/toc/${MUNICIPALITY_CODE}`) && resp.status() === 200,
    { timeout: 60_000 }
  );

  await navigateWithCloudflare(page, `${BASE_URL}/${MUNICIPALITY_CODE}`);

  const tocResponse = await tocPromise;
  tocData = (await tocResponse.json()) as TocNode;

  if (!tocData) {
    throw new Error("Failed to capture TOC data from API");
  }

  return tocData;
}

// Re-export flattenToc from utils for backward compatibility
export { flattenToc } from "./utils.js";

/**
 * Extract all nodes that serve as scrapable pages containing sections.
 * This includes "article" nodes AND chapters that directly parent sections
 * (e.g., Statutory References, Cross Reference Table, Ordinance List).
 */
export function getArticlePages(toc: TocNode): TocNode[] {
  const all = flattenToc(toc);
  const articles = all.filter((n) => n.type === "article");

  // Also collect chapters that directly contain sections (no intermediate articles)
  const chaptersWithDirectSections = all.filter((n) => {
    if (n.type !== "chapter") return false;
    // Check if this chapter has section children but no article children
    const hasArticleChild = n.children.some((c) => c.type === "article");
    const hasSectionChild = n.children.some((c) => c.type === "section");
    return !hasArticleChild && hasSectionChild;
  });

  return [...articles, ...chaptersWithDirectSections];
}

/** Extract all section-level nodes from the TOC */
export function getSections(toc: TocNode): TocNode[] {
  return flattenToc(toc).filter((n) => n.type === "section");
}

/** Get a summary of the TOC structure */
export function tocSummary(toc: TocNode): string {
  const all = flattenToc(toc);
  const typeCounts = new Map<string, number>();
  for (const node of all) {
    typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
  }

  const lines = [`Municipality: ${toc.tocName} (${toc.guid})`];
  for (const [type, count] of typeCounts) {
    lines.push(`  ${type}: ${count}`);
  }
  lines.push(`  Total nodes: ${all.length}`);
  return lines.join("\n");
}
