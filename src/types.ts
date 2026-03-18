/** All TypeScript interfaces for the Crescent City Municipal Code project */

// ─── TOC / Scraping ──────────────────────────────────────────────

/** A node in the ecode360 table of contents tree */
export interface TocNode {
  prefix: string;
  tocName: string;
  guid: string;
  parent: string | null;
  href: string;
  title: string;
  number: string;
  indexNum: string;
  type: "code" | "division" | "chapter" | "article" | "part" | "subarticle" | "section";
  label: string;
  hideNumber: boolean;
  children: TocNode[];
}

/** Scraped content for a single article (chapter) page */
export interface ArticlePage {
  guid: string;
  url: string;
  title: string;
  number: string;
  /** Raw inner HTML of #codeContent */
  rawHtml: string;
  /** Sections extracted from the page */
  sections: SectionContent[];
  /** SHA-256 hash of rawHtml for integrity verification */
  sha256: string;
  scrapedAt: string;
}

/** A single section (e.g. § 1.04.010) extracted from an article page */
export interface SectionContent {
  guid: string;
  number: string;
  title: string;
  /** Raw inner HTML of the section content div */
  html: string;
  /** Plain text of the section */
  text: string;
  /** Legislative history line */
  history: string;
}

/** Manifest tracking all scraped content */
export interface ScrapeManifest {
  municipality: string;
  municipalityGuid: string;
  sourceUrl: string;
  version: string;
  scrapedAt: string;
  completedAt: string;
  tocNodeCount: number;
  articlePageCount: number;
  sectionCount: number;
  /** Map of article guid → ArticlePage metadata (without rawHtml) */
  articles: Record<string, {
    guid: string;
    title: string;
    number: string;
    sectionCount: number;
    sha256: string;
    filePath: string;
  }>;
}

// ─── Verification ────────────────────────────────────────────────

/** Verification result for a single article */
export interface VerificationResult {
  guid: string;
  title: string;
  status: "pass" | "fail";
  checks: {
    fileExists: boolean;
    sha256Match: boolean;
    sectionCountMatch: boolean;
    expectedSections: number;
    foundSections: number;
    allSectionsPresent: boolean;
    missingSections: string[];
  };
}

/** Overall verification report */
export interface VerificationReport {
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

// ─── Shared data ─────────────────────────────────────────────────

/** A flattened section with article metadata for search/display */
export interface FlatSection {
  guid: string;
  number: string;
  title: string;
  text: string;
  history: string;
  articleGuid: string;
  articleTitle: string;
  articleNumber: string;
}

// ─── GUI / Search ────────────────────────────────────────────────

/** Search result wrapping a FlatSection */
export interface SearchResult {
  section: FlatSection;
  snippet: string;
  matchCount: number;
}

// ─── LLM / Chat ──────────────────────────────────────────────────

/** A chat message for LLM interactions */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** A source citation from RAG retrieval */
export interface RagSource {
  sectionGuid: string;
  sectionNumber: string;
  sectionTitle: string;
  snippet: string;
  score: number;
}

/** Response from the RAG pipeline */
export interface RagResponse {
  answer: string;
  sources: RagSource[];
  model: string;
}

// ─── Analytics ───────────────────────────────────────────────────

/** Per-title aggregate statistics */
export interface TitleStats {
  title: string;
  sectionCount: number;
  wordCount: number;
  avgWordsPerSection: number;
}

/** Aggregate municipal code statistics */
export interface CodeStats {
  totalArticles: number;
  totalSections: number;
  totalWords: number;
  avgWordsPerSection: number;
  byTitle: TitleStats[];
  longestSections: Array<{ number: string; title: string; wordCount: number }>;
  shortestSections: Array<{ number: string; title: string; wordCount: number }>;
}

/** A single point in a PCA projection */
export interface EmbeddingPoint {
  x: number;
  y: number;
  cluster: number;
  label: string;
  sectionNumber: string;
}

/** Pearson correlation of a term to a principal component */
export interface WordLoading {
  word: string;
  pc1: number;
  pc2: number;
  combined: number;
}

/** Full PCA projection result */
export interface EmbeddingProjection {
  points: EmbeddingPoint[];
  wordLoadings: WordLoading[];
  explainedVariance: number[];
}

// ─── Monitoring ──────────────────────────────────────────────────

/** Municipal code change detection report */
export interface MonitorReport {
  timestamp: string;
  articlesChecked: number;
  hashMismatches: string[];
  missingSections: string[];
  newSections: string[];
  overallStatus: "clean" | "changed" | "error";
  summary: string;
}

/** A news item fetched from an RSS feed */
export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  fetchedAt: string;
}

/** A government meeting item scraped from a city website */
export interface MeetingItem {
  id: string;
  title: string;
  body: string;
  source: string;
  url: string;
  fetchedAt: string;
  hash: string;
}

// ─── Intelligence Domains ────────────────────────────────────────

/** Cross-reference from a domain topic to a municipal code section */
export interface DomainSource {
  /** Municipal code section number, e.g. "§ 8.04.010" */
  sectionNumber: string;
  /** Brief description of relevance */
  relevance: string;
}

/** A topic within an intelligence domain */
export interface DomainTopic {
  name: string;
  description: string;
  /** Cross-references to municipal code sections */
  sources: DomainSource[];
  /** External reference URLs */
  externalRefs?: string[];
  /** Tags for search/filtering */
  tags: string[];
}

/** A top-level civic intelligence domain */
export interface IntelligenceDomain {
  id: string;
  name: string;
  description: string;
  /** Emoji icon */
  icon: string;
  topics: DomainTopic[];
  /** ISO date of last update */
  updatedAt: string;
}

/** Lightweight domain summary (no topics) for listings */
export interface DomainSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  topicCount: number;
  updatedAt: string;
}
