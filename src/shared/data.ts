/** Shared data loading layer for reading scraped output */
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import type { TocNode, ScrapeManifest, ArticlePage, FlatSection } from "../types.js";
import { paths } from "./paths.js";

/** Load the TOC tree from output/toc.json */
export async function loadToc(): Promise<TocNode> {
  const raw = await readFile(paths.toc, "utf-8");
  return JSON.parse(raw) as TocNode;
}

/** Load the scrape manifest from output/manifest.json */
export async function loadManifest(): Promise<ScrapeManifest> {
  const raw = await readFile(paths.manifest, "utf-8");
  return JSON.parse(raw) as ScrapeManifest;
}

/** Load a single article by GUID */
export async function loadArticle(guid: string): Promise<ArticlePage> {
  const raw = await readFile(paths.article(guid), "utf-8");
  return JSON.parse(raw) as ArticlePage;
}

/** Load all article files from the articles directory */
export async function loadAllArticles(): Promise<ArticlePage[]> {
  const dir = paths.articles;
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const articles: ArticlePage[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const data = JSON.parse(await readFile(`${dir}/${f}`, "utf-8")) as ArticlePage;
    articles.push(data);
  }
  return articles;
}

/** Load all sections as a flat array with article metadata attached */
export async function loadAllSections(): Promise<FlatSection[]> {
  const articles = await loadAllArticles();
  const sections: FlatSection[] = [];
  for (const article of articles) {
    for (const s of article.sections) {
      sections.push({
        guid: s.guid,
        number: s.number,
        title: s.title,
        text: s.text,
        articleGuid: article.guid,
        articleTitle: article.title,
      });
    }
  }
  return sections;
}

/** Simple substring/regex search across all sections */
export async function searchSections(
  query: string,
  sections?: FlatSection[]
): Promise<FlatSection[]> {
  const all = sections ?? (await loadAllSections());
  const lower = query.toLowerCase();
  return all.filter(
    (s) =>
      s.number.toLowerCase().includes(lower) ||
      s.title.toLowerCase().includes(lower) ||
      s.text.toLowerCase().includes(lower)
  );
}
