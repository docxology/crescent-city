/**
 * Lightweight Porter stemmer (Step 1a–5b) — zero external dependencies.
 *
 * Based on Martin Porter's algorithm (1980), adapted for TypeScript.
 * Sufficient for English legal text normalization in search engines.
 *
 * Usage:
 *   import { stem, stemTokens } from './src/shared/porter_stem.ts';
 *   stem('zones')  // → 'zone'
 *   stem('fishing') // → 'fish'
 */

/** Returns true if char at position i in s is a consonant */
function cons(s: string, i: number): boolean {
  const c = s[i];
  if ('aeiou'.includes(c)) return false;
  if (c === 'y') return i === 0 ? true : !cons(s, i - 1);
  return true;
}

/** Count the number of VC clusters (measure m) in s[0..j] */
function m(s: string, j: number): number {
  let n = 0;
  let i = 0;
  while (true) {
    if (i > j) return n;
    if (!cons(s, i)) break;
    i++;
  }
  i++;
  while (true) {
    while (true) {
      if (i > j) return n;
      if (cons(s, i)) break;
      i++;
    }
    i++;
    n++;
    while (true) {
      if (i > j) return n;
      if (!cons(s, i)) break;
      i++;
    }
    i++;
  }
}

/** Returns true if s[0..j] contains a vowel */
function vowelInStem(s: string, j: number): boolean {
  for (let i = 0; i <= j; i++) if (!cons(s, i)) return true;
  return false;
}

/** Returns true if s[j-1] and s[j] are the same consonant */
function doubleCons(s: string, j: number): boolean {
  if (j < 1) return false;
  if (s[j] !== s[j - 1]) return false;
  return cons(s, j);
}

/** Returns true if s ends *o — cvc sequence where the last c is not w, x, or y */
function cvcCond(s: string, i: number): boolean {
  if (i < 2 || !cons(s, i) || cons(s, i - 1) || !cons(s, i - 2)) return false;
  return !'wxy'.includes(s[i]);
}

/**
 * Stem a single English word using the Porter algorithm.
 * Input should be lowercase; returns lowercase stemmed form.
 */
export function stem(word: string): string {
  if (word.length <= 2) return word;
  let s = word.toLowerCase();

  // Step 1a
  if (s.endsWith('sses')) { s = s.slice(0, -2); }
  else if (s.endsWith('ies')) { s = s.slice(0, -2); }
  else if (s.endsWith('ss')) { /* keep */ }
  else if (s.endsWith('s')) { s = s.slice(0, -1); }

  // Step 1b
  let step1bFlag = false;
  if (s.endsWith('eed')) {
    if (m(s, s.length - 4) > 0) s = s.slice(0, -1);
  } else if (s.endsWith('ed')) {
    if (vowelInStem(s, s.length - 3)) { s = s.slice(0, -2); step1bFlag = true; }
  } else if (s.endsWith('ing')) {
    if (vowelInStem(s, s.length - 4)) { s = s.slice(0, -3); step1bFlag = true; }
  }

  if (step1bFlag) {
    if (s.endsWith('at') || s.endsWith('bl') || s.endsWith('iz')) {
      s += 'e';
    } else if (doubleCons(s, s.length - 1) && !'lsz'.includes(s[s.length - 1])) {
      s = s.slice(0, -1);
    } else if (m(s, s.length - 1) === 1 && cvcCond(s, s.length - 1)) {
      s += 'e';
    }
  }

  // Step 1c
  if (s.endsWith('y') && vowelInStem(s, s.length - 2)) s = s.slice(0, -1) + 'i';

  // Step 2
  const step2: Array<[string, string]> = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
    ['izer', 'ize'], ['bli', 'ble'], ['alli', 'al'], ['entli', 'ent'],
    ['eli', 'e'], ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
    ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble'],
  ];
  for (const [suf, rep] of step2) {
    if (s.endsWith(suf) && m(s, s.length - suf.length - 1) > 0) {
      s = s.slice(0, -suf.length) + rep;
      break;
    }
  }

  // Step 3
  const step3: Array<[string, string]> = [
    ['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'],
    ['ical', 'ic'], ['ful', ''], ['ness', ''],
  ];
  for (const [suf, rep] of step3) {
    if (s.endsWith(suf) && m(s, s.length - suf.length - 1) > 0) {
      s = s.slice(0, -suf.length) + rep;
      break;
    }
  }

  // Step 4
  const step4 = ['al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement',
    'ment', 'ent', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize'];
  for (const suf of step4) {
    if (s.endsWith(suf)) {
      const base = s.slice(0, -suf.length);
      if (m(s, base.length - 1) > 1) { s = base; break; }
    }
  }
  if (s.endsWith('ion')) {
    const base = s.slice(0, -3);
    if (m(s, base.length - 1) > 1 && (base.endsWith('s') || base.endsWith('t'))) s = base;
  }

  // Step 5a
  if (s.endsWith('e')) {
    const base = s.slice(0, -1);
    if (m(s, base.length - 1) > 1) s = base;
    else if (m(s, base.length - 1) === 1 && !cvcCond(base, base.length - 1)) s = base;
  }

  // Step 5b
  if (s.endsWith('ll') && m(s, s.length - 1) > 1) s = s.slice(0, -1);

  return s;
}

/**
 * Stem an array of tokens (already lowercased).
 */
export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stem);
}

/**
 * Tokenize + stem a text into a set of unique stems.
 * Useful for building inverted index entries.
 */
export function stemSet(text: string): Set<string> {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
  return new Set(tokens.map(stem));
}
