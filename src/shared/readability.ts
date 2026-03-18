/**
 * Readability utilities for municipal code sections.
 *
 * Implements:
 * - Flesch-Kincaid Grade Level (standard legal readability metric)
 * - Flesch Reading Ease score
 * - Simple word-count statistics
 *
 * No external dependencies — pure TypeScript/arithmetic.
 *
 * Grade level interpretation:
 *   < 8: Plain language (ideal for public notices)
 *   8-12: High school level
 *   12-16: College level (typical for legal text)
 *   > 16: Professional/legal (often impenetrable to average reader)
 */

/** Count syllables in an English word using vowel-run heuristic */
function syllableCount(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;

  // Remove silent trailing 'e'
  const stripped = word.replace(/e$/, '');

  // Count vowel runs
  const runs = stripped.match(/[aeiouy]+/g);
  const count = runs ? runs.length : 1;

  return Math.max(1, count);
}

/** Split text into sentences (handles periods, !, ?) */
function splitSentences(text: string): string[] {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
}

/** Split text into words (alphabetic only) */
function splitWords(text: string): string[] {
  return (text.match(/\b[a-zA-Z]+\b/g) ?? []).filter(w => w.length > 0);
}

export interface ReadabilityScore {
  /** Flesch-Kincaid Grade Level (US school grade equivalent) */
  gradeLevel: number;
  /** Flesch Reading Ease (0-100, higher = easier) */
  readingEase: number;
  /** Average syllables per word */
  avgSyllablesPerWord: number;
  /** Average words per sentence */
  avgWordsPerSentence: number;
  /** Total word count */
  wordCount: number;
  /** Total sentence count */
  sentenceCount: number;
  /** Plain-English label */
  difficulty: "plain" | "standard" | "complex" | "legal";
}

/**
 * Compute Flesch-Kincaid readability scores for a text.
 * Returns null for text that is too short to score meaningfully (< 10 words).
 */
export function computeReadability(text: string): ReadabilityScore | null {
  const words = splitWords(text);
  const sentences = splitSentences(text);

  if (words.length < 10 || sentences.length < 1) return null;

  const totalSyllables = words.reduce((n, w) => n + syllableCount(w), 0);
  const ASL = words.length / sentences.length;          // average sentence length
  const ASW = totalSyllables / words.length;             // average syllables per word

  const gradeLevel = Math.round((0.39 * ASL + 11.8 * ASW - 15.59) * 10) / 10;
  const readingEase = Math.round((206.835 - 1.015 * ASL - 84.6 * ASW) * 10) / 10;

  let difficulty: ReadabilityScore['difficulty'];
  if (gradeLevel < 8) difficulty = 'plain';
  else if (gradeLevel < 12) difficulty = 'standard';
  else if (gradeLevel < 16) difficulty = 'complex';
  else difficulty = 'legal';

  return {
    gradeLevel,
    readingEase,
    avgSyllablesPerWord: Math.round(ASW * 100) / 100,
    avgWordsPerSentence: Math.round(ASL * 10) / 10,
    wordCount: words.length,
    sentenceCount: sentences.length,
    difficulty,
  };
}

/**
 * Score all sections and summarize readability for the entire code.
 * Returns a sorted list (hardest → easiest) with per-section scores.
 */
export function scoreCorpusReadability(
  sections: Array<{ number: string; title: string; text: string }>
): Array<{ number: string; title: string; score: ReadabilityScore }> {
  const results: Array<{ number: string; title: string; score: ReadabilityScore }> = [];
  for (const s of sections) {
    const score = computeReadability(s.text);
    if (score) results.push({ number: s.number, title: s.title, score });
  }
  results.sort((a, b) => b.score.gradeLevel - a.score.gradeLevel);
  return results;
}
