#!/usr/bin/env bun
/**
 * Export module.
 *
 * Converts scraped data into usable formats:
 *   1. Full consolidated JSON (all sections in one file)
 *   2. Markdown files organized by title/chapter/section
 *   3. Plain text corpus
 *   4. Section index CSV
 */
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import type { TocNode, ArticlePage } from "./types.js";
import { flattenToc, htmlToText, csvEscape, sanitizeFilename } from "./utils.js";
import { loadToc, loadManifest, loadAllArticles } from "./shared/data.js";
import { paths } from "./shared/paths.js";

async function main() {
  console.log("=== Crescent City Municipal Code Exporter ===\n");

  if (!existsSync(paths.toc) || !existsSync(paths.manifest)) {
    console.error("ERROR: Run the scraper first (bun run scrape)");
    process.exit(1);
  }

  const toc = await loadToc();
  const manifest = await loadManifest();
  const articles = await loadAllArticles();

  console.log(`Loaded ${articles.length} article files\n`);

  // Export 1: Consolidated JSON
  console.log("Exporting consolidated JSON...");
  const consolidated = {
    municipality: toc.tocName,
    guid: toc.guid,
    source: "https://ecode360.com/CR4919",
    exportedAt: new Date().toISOString(),
    articles: articles.map((a) => ({
      guid: a.guid,
      title: a.title,
      number: a.number,
      url: a.url,
      sha256: a.sha256,
      sections: a.sections.map((s) => ({
        guid: s.guid,
        number: s.number,
        title: s.title,
        text: s.text,
        history: s.history,
      })),
    })),
  };
  await writeFile(
    paths.consolidatedJson,
    JSON.stringify(consolidated, null, 2)
  );
  console.log(`  -> ${paths.consolidatedJson}`);

  // Export 2: Markdown by title/chapter
  console.log("Exporting Markdown files...");
  const mdDir = paths.markdown;
  await mkdir(mdDir, { recursive: true });

  // Build title grouping from TOC
  const titleNodes = flattenToc(toc).filter(
    (n) => n.type === "chapter" && n.label === "Title"
  );

  for (const title of titleNodes) {
    const titleDir = `${mdDir}/Title_${title.number.padStart(2, "0")}_${sanitizeFilename(title.title)}`;
    await mkdir(titleDir, { recursive: true });

    // Write title index
    const titleIndex = [`# Title ${title.number}: ${title.title}\n`];

    const chapterNodes = title.children.filter((c) => c.type === "article");
    for (const chapter of chapterNodes) {
      const article = articles.find((a) => a.guid === chapter.guid);
      if (!article) continue;

      titleIndex.push(`## Chapter ${chapter.number}: ${chapter.title}\n`);

      const mdLines = [
        `# Chapter ${chapter.number}: ${chapter.title}\n`,
        `> Part of Title ${title.number}: ${title.title}\n`,
        `> Source: ${article.url}\n`,
      ];

      for (const section of article.sections) {
        mdLines.push(`\n## ${section.number}: ${section.title}\n`);
        mdLines.push(section.text || htmlToText(section.html));
        if (section.history) {
          mdLines.push(`\n*${section.history}*\n`);
        }
        titleIndex.push(
          `- [${section.number}: ${section.title}](${sanitizeFilename(chapter.number)}.md#${section.number.replace(/§\s*/, "").replace(/\s/g, "-")})`
        );
      }

      await writeFile(
        `${titleDir}/${sanitizeFilename(chapter.number)}.md`,
        mdLines.join("\n")
      );
    }

    await writeFile(`${titleDir}/README.md`, titleIndex.join("\n"));
  }

  // Handle appendices and other top-level divisions
  const appendixArticles = flattenToc(toc).filter(
    (n) => n.type === "article" && !titleNodes.some((t) => t.guid === n.parent)
  );

  if (appendixArticles.length > 0) {
    const otherDir = `${mdDir}/Other`;
    await mkdir(otherDir, { recursive: true });

    for (const chapter of appendixArticles) {
      const article = articles.find((a) => a.guid === chapter.guid);
      if (!article) continue;

      const mdLines = [
        `# ${chapter.indexNum}: ${chapter.title}\n`,
        `> Source: ${article.url}\n`,
      ];

      for (const section of article.sections) {
        mdLines.push(`\n## ${section.number}: ${section.title}\n`);
        mdLines.push(section.text || htmlToText(section.html));
        if (section.history) {
          mdLines.push(`\n*${section.history}*\n`);
        }
      }

      await writeFile(
        `${otherDir}/${sanitizeFilename(chapter.indexNum || chapter.guid)}.md`,
        mdLines.join("\n")
      );
    }
  }

  console.log(`  -> ${paths.markdown}/`);

  // Export 3: Plain text corpus
  console.log("Exporting plain text corpus...");
  const textLines: string[] = [
    `CRESCENT CITY, CA - CODE OF ORDINANCES`,
    `Source: https://ecode360.com/CR4919`,
    `Exported: ${new Date().toISOString()}`,
    `${"=".repeat(60)}\n`,
  ];

  for (const article of articles.sort((a, b) => a.number.localeCompare(b.number))) {
    textLines.push(`\nCHAPTER ${article.number}: ${article.title}`);
    textLines.push("-".repeat(40));

    for (const section of article.sections) {
      textLines.push(`\n${section.number}: ${section.title}`);
      textLines.push(section.text || htmlToText(section.html));
      if (section.history) {
        textLines.push(`[${section.history}]`);
      }
    }
  }

  await writeFile(paths.plainText, textLines.join("\n"));
  console.log(`  -> ${paths.plainText}`);

  // Export 4: Section index CSV
  console.log("Exporting section index CSV...");
  const csvLines = ["guid,number,title,chapter_guid,chapter_number,chapter_title,history"];
  for (const article of articles) {
    for (const section of article.sections) {
      csvLines.push(
        [
          section.guid,
          csvEscape(section.number),
          csvEscape(section.title),
          article.guid,
          csvEscape(article.number),
          csvEscape(article.title),
          csvEscape(section.history),
        ].join(",")
      );
    }
  }
  await writeFile(paths.sectionIndex, csvLines.join("\n"));
  console.log(`  -> ${paths.sectionIndex}`);

  // Summary
  const totalSections = articles.reduce((s, a) => s + a.sections.length, 0);
  console.log(`\n=== Export Complete ===`);
  console.log(`  Articles: ${articles.length}`);
  console.log(`  Sections: ${totalSections}`);
  console.log(`  Formats: JSON, Markdown, Plain Text, CSV`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
