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
  /** Map of article guid -> ArticlePage metadata (without rawHtml) */
  articles: Record<string, {
    guid: string;
    title: string;
    number: string;
    sectionCount: number;
    sha256: string;
    filePath: string;
  }>;
}

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

/** A flattened section with article metadata for search/display */
export interface FlatSection {
  guid: string;
  number: string;
  title: string;
  text: string;
  articleGuid: string;
  articleTitle: string;
}

/** Search result wrapping a FlatSection */
export interface SearchResult {
  section: FlatSection;
  snippet: string;
  matchCount: number;
}

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
