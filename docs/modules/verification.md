# Verification Module

## `src/verify.ts` — Data Integrity Verification

Independent verification of scraped content for completeness and accuracy.

### Verification Checks

| Check | Description |
|-------|-------------|
| **File Existence** | Every expected article JSON file exists on disk |
| **SHA-256 Match** | Re-computed hash of saved `rawHtml` matches manifest hash |
| **Section Count** | Number of scraped sections ≥ expected sections from TOC |
| **Section Presence** | Every expected section GUID from the TOC exists in scraped data |
| **Live Re-fetch** | Random sample of 5 pages re-fetched and SHA-256 compared to live site |

### Internal Functions

| Function | Description |
|----------|-------------|
| `collectDescendantSections` | Recursively collects section nodes nested under subarticles and parts within an article |

### Output

Writes `output/verification-report.json` containing:

```typescript
interface VerificationReport {
  verifiedAt: string;
  municipality: string;
  overallStatus: "pass" | "fail";
  totalArticles: number;
  passedArticles: number;
  failedArticles: number;
  totalExpectedSections: number;
  totalFoundSections: number;
  missingSections: string[];
  results: VerificationResult[];
}
```

### Usage

```bash
bun run verify
```

Exit code 1 on failure. Requires `output/toc.json` and `output/manifest.json` to exist (run scraper first).
