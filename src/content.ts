/**
 * Content scraper module.
 * Navigates to each article page and extracts section content.
 * Supports two scraping modes:
 *   1. Standard: article pages that inline all section content
 *   2. Deep: subarticle pages where sections must be scraped individually
 */
import type { Page } from "playwright";
import type { TocNode, ArticlePage, SectionContent } from "./types.js";
import { navigateWithCloudflare } from "./browser.js";
import { BASE_URL, RATE_LIMIT_MS } from "./constants.js";
import { computeSha256 } from "./utils.js";

/**
 * Extract all section-type descendant GUIDs from a TOC node.
 */
function getSectionGuids(node: TocNode): { guid: string; number: string; title: string }[] {
  const results: { guid: string; number: string; title: string }[] = [];
  if (node.type === "section") {
    results.push({ guid: node.guid, number: node.number ?? node.indexNum ?? "", title: node.title ?? "" });
  }
  for (const child of node.children ?? []) {
    results.push(...getSectionGuids(child));
  }
  return results;
}

/**
 * Scrape a single section page and extract its content.
 * Used for sections in subarticle-layout pages.
 */
async function scrapeSectionPage(
  page: Page,
  sectionGuid: string,
  sectionNumber: string,
  sectionTitle: string
): Promise<SectionContent | null> {
  const url = `${BASE_URL}/${sectionGuid}`;
  try {
    await navigateWithCloudflare(page, url);
    await page.waitForSelector("#codeContent", { timeout: 30_000 })
      .catch(() => { });
    await page.waitForTimeout(1000);

    const result = await page.evaluate((guid) => {
      // Try the standard pattern first
      const contentDiv = document.querySelector(`.section_content.content`) as HTMLElement | null;
      if (contentDiv) {
        const clone = contentDiv.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".history, .footnotes").forEach((el) => el.remove());
        const historyEl = contentDiv.querySelector(".history");
        return {
          html: contentDiv.innerHTML,
          text: clone.textContent?.trim() ?? "",
          history: historyEl?.textContent?.trim() ?? "",
        };
      }

      // Fallback: grab all text from codeContent
      const codeContent = document.querySelector("#codeContent") as HTMLElement | null;
      if (codeContent) {
        const clone = codeContent.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".history, .footnotes, .contentTitle").forEach((el) => el.remove());
        const historyEl = codeContent.querySelector(".history");
        return {
          html: codeContent.innerHTML,
          text: clone.textContent?.trim() ?? "",
          history: historyEl?.textContent?.trim() ?? "",
        };
      }

      return null;
    }, sectionGuid);

    if (!result || !result.text) return null;

    return {
      guid: sectionGuid,
      number: sectionNumber,
      title: sectionTitle,
      html: result.html,
      text: result.text,
      history: result.history,
    };
  } catch (err: any) {
    console.warn(`  [deep] Failed to scrape section ${sectionNumber}: ${err.message?.split("\n")[0]}`);
    return null;
  }
}

/**
 * Scrape an article page and extract all section content.
 * Article pages contain full text of all child sections.
 * Falls back to deep-scraping individual section pages for subarticle layouts.
 */
export async function scrapeArticlePage(
  page: Page,
  article: TocNode
): Promise<ArticlePage> {
  const url = `${BASE_URL}/${article.guid}`;
  await navigateWithCloudflare(page, url);

  // Wait for code content to render
  await page.waitForSelector("#codeContent", { timeout: 30_000 })
    .catch((e) => console.warn("codeContent selector timeout:", e.message));
  await page.waitForTimeout(1500);

  // Extract the raw HTML of the code content area
  const rawHtml = await page.evaluate(() => {
    const el = document.querySelector("#codeContent");
    return el ? el.innerHTML : "";
  });

  // Extract individual sections (standard extraction)
  const sections = await page.evaluate(() => {
    const results: {
      guid: string;
      number: string;
      title: string;
      html: string;
      text: string;
      history: string;
    }[] = [];

    // Each section has a content div with id like "44236161_content"
    const contentDivs = document.querySelectorAll(
      '.section_content.content'
    );

    contentDivs.forEach((div) => {
      const id = div.id; // e.g., "44236161_content"
      const guid = id.replace("_content", "");

      // Find the corresponding title element (use getElementById since IDs start with digit)
      const titleEl = document.getElementById(`${guid}_title`) || document.getElementById(guid);
      const numberEl = titleEl?.querySelector(".titleNumber");
      const titleTextEl = titleEl?.querySelector(".titleTitle");

      const number = numberEl?.textContent?.trim() ?? "";
      const title = titleTextEl?.textContent?.trim() ?? "";

      // Get the section content
      const html = div.innerHTML;

      // Get plain text from all content elements (paras, definitions, tables, etc.)
      // Exclude .history and .footnotes which are handled separately
      const clone = div.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".history, .footnotes").forEach((el) => el.remove());
      const text = clone.textContent?.trim() ?? "";

      // Get history
      const historyEl = div.querySelector(".history");
      const history = historyEl?.textContent?.trim() ?? "";

      results.push({ guid, number, title, html, text, history });
    });

    return results;
  });

  let finalSections = sections as SectionContent[];

  // Deep-scrape fallback: if article has child sections in TOC but none were extracted,
  // the article uses subarticle layout, so scrape each section page individually
  const expectedSections = getSectionGuids(article);
  if (finalSections.length === 0 && expectedSections.length > 0) {
    console.log(`  [deep] Subarticle layout detected — deep-scraping ${expectedSections.length} sections individually`);
    const deepSections: SectionContent[] = [];

    for (const { guid, number, title } of expectedSections) {
      const sectionContent = await scrapeSectionPage(page, guid, number, title);
      if (sectionContent) {
        deepSections.push(sectionContent);
      }
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS / 2)); // Rate limit
    }

    finalSections = deepSections;
    console.log(`  [deep] Extracted ${deepSections.length}/${expectedSections.length} sections`);
  }

  const sha256 = await computeSha256(rawHtml);

  return {
    guid: article.guid,
    url,
    title: article.title,
    number: article.number,
    rawHtml,
    sections: finalSections,
    sha256,
    scrapedAt: new Date().toISOString(),
  };
}

