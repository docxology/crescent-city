# Export Module

## `src/export.ts` — Multi-Format Exporter

Converts scraped data into four usable formats.

### Output Formats

| Format | File | Description |
|--------|------|-------------|
| **JSON** | `output/crescent-city-code.json` | All sections with full metadata in one consolidated file |
| **Markdown** | `output/markdown/` | Organized by Title/Chapter directories with cross-linked README indices |
| **Plain Text** | `output/crescent-city-code.txt` | Full text corpus, suitable for NLP/text processing |
| **CSV** | `output/section-index.csv` | Section index with GUIDs, numbers, titles, chapter info, history |

### Markdown Organization

```
output/markdown/
  Title_01_General_Provisions/
    README.md          # Title index with links to all sections
    1.04.md            # Chapter content
    1.08.md
    ...
  Title_02_Administration_Personnel/
    ...
  Other/               # Appendices and standalone articles
```

### CSV Schema

```
guid,number,title,chapter_guid,chapter_number,chapter_title,history
```

### Dependencies

Uses utility functions from `utils.ts`:

- `flattenToc` — traverse TOC tree for title grouping
- `htmlToText` — fallback text extraction from HTML
- `csvEscape` — safe CSV value formatting
- `sanitizeFilename` — filesystem-safe directory and file names

### Usage

```bash
bun run export    # Requires scraper output to exist
```
