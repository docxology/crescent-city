/** Shared utility functions */
import type { TocNode } from "./types.js";

/** Compute SHA-256 hash of a string */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Flatten a TOC tree into a list of all nodes */
export function flattenToc(node: TocNode): TocNode[] {
  const result: TocNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenToc(child));
  }
  return result;
}

/** Fisher-Yates shuffle (returns new array) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Convert HTML to plain text with basic formatting */
export function htmlToText(html: string): string {
  return html
    .replace(/<div class="para[^"]*">/g, "\n")
    .replace(/<div class="history">/g, "\n[History: ")
    .replace(/<span class="loclaw">/g, "")
    .replace(/<\/span>/g, "")
    .replace(/<\/div>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Escape a value for CSV output */
export function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/** Sanitize a string for use as a filename */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 80);
}
