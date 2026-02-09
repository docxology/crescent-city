/**
 * Analytics module — computes municipal code statistics and PCA embedding projections.
 * All computations are done server-side with no external charting/math dependencies.
 */
import { loadAllArticles, loadAllSections } from "../shared/data.js";
import type { ArticlePage, FlatSection } from "../types.js";
import { getOrCreateCollection, isChromaRunning, getStats } from "../llm/chroma.js";
import { flattenToc } from "../utils.js";
import { loadToc } from "../shared/data.js";

// ─── Title extraction ────────────────────────────────────────────

/** Extract the Title number from a section's article title (e.g., "GENERAL PROVISIONS" → "Title 1") */
function inferTitle(articleTitle: string, sectionNumber: string): string {
    // Section numbers like § 17.63.070 → Title 17
    const secMatch = sectionNumber.replace(/§\s*/, "").match(/^(\d+)\./);
    if (secMatch) return `Title ${parseInt(secMatch[1], 10)}`;

    // Fallback: try article title keywords
    if (/appendix/i.test(articleTitle)) return "Appendix";
    if (/statutory/i.test(articleTitle)) return "Statutory Ref";
    if (/cross.?ref/i.test(articleTitle)) return "Cross Ref";
    if (/ordinance/i.test(articleTitle)) return "Ordinance List";
    return "Other";
}

// ─── Code Statistics ─────────────────────────────────────────────

export interface TitleStats {
    title: string;
    articleCount: number;
    sectionCount: number;
    wordCount: number;
}

export interface CodeStats {
    totalArticles: number;
    totalSections: number;
    totalWords: number;
    avgWordsPerSection: number;
    titleBreakdown: TitleStats[];
    longestSections: { number: string; title: string; words: number; guid: string }[];
    shortestSections: { number: string; title: string; words: number; guid: string }[];
}

/** Compute aggregate statistics about the municipal code */
export async function getCodeStats(): Promise<CodeStats> {
    const articles = await loadAllArticles();
    const sections = await loadAllSections();

    // Per-title aggregation
    const titleMap = new Map<string, TitleStats>();

    for (const section of sections) {
        const titleKey = inferTitle(section.articleTitle, section.number);
        if (!titleMap.has(titleKey)) {
            titleMap.set(titleKey, { title: titleKey, articleCount: 0, sectionCount: 0, wordCount: 0 });
        }
        const t = titleMap.get(titleKey)!;
        t.sectionCount++;
        t.wordCount += section.text.split(/\s+/).filter(Boolean).length;
    }

    // Count articles per title
    for (const article of articles) {
        const firstSection = article.sections[0];
        const titleKey = firstSection
            ? inferTitle(article.title, firstSection.number)
            : inferTitle(article.title, "");
        if (titleMap.has(titleKey)) titleMap.get(titleKey)!.articleCount++;
    }

    const titleBreakdown = [...titleMap.values()].sort((a, b) => {
        const aNum = parseInt(a.title.replace(/\D/g, ""), 10) || 999;
        const bNum = parseInt(b.title.replace(/\D/g, ""), 10) || 999;
        return aNum - bNum;
    });

    // Section word counts for top/bottom lists
    const sectionWords = sections.map((s) => ({
        number: s.number,
        title: s.title,
        guid: s.guid,
        words: s.text.split(/\s+/).filter(Boolean).length,
    }));
    sectionWords.sort((a, b) => b.words - a.words);

    const totalWords = sectionWords.reduce((s, x) => s + x.words, 0);

    return {
        totalArticles: articles.length,
        totalSections: sections.length,
        totalWords,
        avgWordsPerSection: Math.round(totalWords / (sections.length || 1)),
        titleBreakdown,
        longestSections: sectionWords.slice(0, 10),
        shortestSections: sectionWords.filter((s) => s.words > 0).slice(-10).reverse(),
    };
}

// ─── PCA Embedding Projection ────────────────────────────────────

export interface EmbeddingPoint {
    x: number;
    y: number; // Still kept for 2D default view (PC1, PC2)
    projections: number[]; // Scores for all PCs
    guid: string;
    sectionNumber: string;
    sectionTitle: string;
    articleTitle: string;
    titleGroup: string;
    cluster?: number;
}

export interface WordLoading {
    word: string;
    correlations: number[]; // Correlation with each PC (index 0 = PC1)
}

export interface EmbeddingProjection {
    points: EmbeddingPoint[];
    totalVectors: number;
    variance: number[]; // Explained variance for each PC
    wordLoadings: WordLoading[]; // top terms correlated with PC axes
}

const NUM_PCS = 10;

/**
 * Fetch embeddings from ChromaDB and project to N dimensions via PCA.
 * Uses covariance matrix + power iteration — no external math library.
 */
export async function getEmbeddingProjection(): Promise<EmbeddingProjection> {
    const coll = await getOrCreateCollection();
    const count = await coll.count();

    if (count === 0) {
        return { points: [], totalVectors: 0, variance: [], wordLoadings: [] };
    }

    // Fetch all embeddings from ChromaDB (batch to avoid OOM)
    const BATCH = 500;
    const allIds: string[] = [];
    const allEmbeddings: number[][] = [];
    const allMetas: Record<string, string>[] = [];
    const allDocs: string[] = [];

    for (let offset = 0; offset < count; offset += BATCH) {
        const result = await coll.get({
            limit: BATCH,
            offset,
            include: ["embeddings", "metadatas", "documents"] as any,
        });
        if (result.ids) allIds.push(...result.ids);
        if (result.embeddings) allEmbeddings.push(...(result.embeddings as number[][]));
        if (result.metadatas) allMetas.push(...(result.metadatas as Record<string, string>[]));
        if (result.documents) allDocs.push(...(result.documents as string[]));
    }

    if (allEmbeddings.length === 0) {
        return { points: [], totalVectors: 0, variance: [], wordLoadings: [] };
    }

    // Subsample if too many points (>2000) for performance
    let indices = Array.from({ length: allEmbeddings.length }, (_, i) => i);
    const MAX_POINTS = 2000;
    if (indices.length > MAX_POINTS) {
        // Deterministic subsample: take every Nth
        const step = Math.ceil(indices.length / MAX_POINTS);
        indices = indices.filter((_, i) => i % step === 0);
    }

    const embeddings = indices.map((i) => allEmbeddings[i]);
    const metas = indices.map((i) => allMetas[i]);
    const docs = indices.map((i) => allDocs[i] || "");
    const dim = embeddings[0].length;
    const n = embeddings.length;

    // Center the data
    const mean = new Float64Array(dim);
    for (const vec of embeddings) {
        for (let j = 0; j < dim; j++) mean[j] += vec[j];
    }
    for (let j = 0; j < dim; j++) mean[j] /= n;

    const centered = embeddings.map((vec) => {
        const c = new Float64Array(dim);
        for (let j = 0; j < dim; j++) c[j] = vec[j] - mean[j];
        return c;
    });

    // Compute top N principal components via power iteration
    const pcs: { vector: Float64Array; eigenvalue: number }[] = [];
    let currentData = centered;

    for (let k = 0; k < NUM_PCS; k++) {
        const pc = powerIteration(currentData, dim, null); // Deflation handled by update step below
        pcs.push(pc);

        // Deflate data: subtract projection onto this component
        // X_new = X - (X . v) * v^T
        // But powerIteration already finds dominant component of current matrix.
        // Standard deflation: X_{k+1} = X_k - v_k * v_k^T * X_k
        // Here we just project out the component from each vector.
        currentData = currentData.map((vec) => {
            const proj = dot(vec, pc.vector);
            const deflated = new Float64Array(dim);
            for (let j = 0; j < dim; j++) deflated[j] = vec[j] - proj * pc.vector[j];
            return deflated;
        });
    }

    // Project onto all PCs
    const projectionScores = centered.map((vec) =>
        pcs.map(pc => dot(vec, pc.vector))
    );

    // Normalize PC1 and PC2 to [-1, 1] for default view
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Scan PC1 (index 0) and PC2 (index 1) range
    for (const scores of projectionScores) {
        const x = scores[0];
        const y = scores[1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Perform K-Means clustering
    const k = 6;
    const { assignments } = kmeans(projectionScores, k);

    const points: EmbeddingPoint[] = projectionScores.map((scores, i) => ({
        x: (scores[0] - minX) / rangeX * 2 - 1, // Default X (PC1)
        y: (scores[1] - minY) / rangeY * 2 - 1, // Default Y (PC2)
        projections: scores,
        guid: metas[i]?.sectionGuid ?? "",
        sectionNumber: metas[i]?.sectionNumber ?? "",
        sectionTitle: metas[i]?.sectionTitle ?? "",
        articleTitle: metas[i]?.articleTitle ?? "",
        titleGroup: inferTitle(metas[i]?.articleTitle ?? "", metas[i]?.sectionNumber ?? ""),
        cluster: assignments[i],
    }));

    // Compute word loadings: correlate term frequencies with PC scores
    const wordLoadings = computeWordLoadings(docs, projectionScores, pcs);

    return {
        points,
        totalVectors: count,
        variance: pcs.map(p => p.eigenvalue),
        wordLoadings,
    };
}

// ─── Clustering ──────────────────────────────────────────────────

export function kmeans(data: number[][], k: number, maxIter = 50): { centroids: number[][]; assignments: number[] } {
    const n = data.length;
    const dim = data[0].length;

    // Initialize centroids (kmeans++ style would be better, but random sample is okay for now)
    // We'll deterministically pick evenly spaced points to be stable
    const centroids: number[][] = [];
    const step = Math.floor(n / k);
    for (let i = 0; i < k; i++) {
        centroids.push([...data[i * step]]);
    }

    const assignments = new Uint8Array(n);
    let changed = true;
    let iter = 0;

    while (changed && iter < maxIter) {
        changed = false;
        iter++;

        // Assign points to nearest centroid
        for (let i = 0; i < n; i++) {
            let minDist = Infinity;
            let bestCluster = 0;
            const point = data[i];

            for (let j = 0; j < k; j++) {
                // Euclidean distance squared
                let dist = 0;
                const centroid = centroids[j];
                for (let d = 0; d < dim; d++) {
                    const diff = point[d] - centroid[d];
                    dist += diff * diff;
                }

                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = j;
                }
            }

            if (assignments[i] !== bestCluster) {
                assignments[i] = bestCluster;
                changed = true;
            }
        }

        // Update centroids
        const sums = Array.from({ length: k }, () => new Float64Array(dim));
        const counts = new Int32Array(k);

        for (let i = 0; i < n; i++) {
            const cluster = assignments[i];
            const point = data[i];
            counts[cluster]++;
            for (let d = 0; d < dim; d++) {
                sums[cluster][d] += point[d];
            }
        }

        for (let j = 0; j < k; j++) {
            if (counts[j] > 0) {
                for (let d = 0; d < dim; d++) {
                    centroids[j][d] = sums[j][d] / counts[j];
                }
            }
        }
    }

    return { centroids, assignments: Array.from(assignments) };
}

// ─── Linear algebra helpers ──────────────────────────────────────

function dot(a: Float64Array, b: Float64Array): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

function norm(v: Float64Array): number {
    return Math.sqrt(dot(v, v));
}

/**
 * Power iteration to find dominant eigenvector of X^T X.
 */
export function powerIteration(
    data: Float64Array[],
    dim: number,
    _unused: any, // kept signature compatible if needed
    iterations = 20 // Reduce iterations for speed since we do 10 components
): { vector: Float64Array; eigenvalue: number } {
    const n = data.length;

    // Initialize random unit vector
    let v = new Float64Array(dim);
    for (let j = 0; j < dim; j++) v[j] = Math.random() - 0.5;
    let n_v = norm(v);
    for (let j = 0; j < dim; j++) v[j] /= n_v;

    let eigenvalue = 0;

    for (let iter = 0; iter < iterations; iter++) {
        // Compute X^T X v  =  X^T (X v)
        // Step 1: w = X v  (n-dimensional)
        const w = new Float64Array(n);
        for (let i = 0; i < n; i++) w[i] = dot(data[i], v);

        // Step 2: v_new = X^T w  (dim-dimensional)
        const v_new = new Float64Array(dim);
        for (let i = 0; i < n; i++) {
            const wi = w[i];
            const row = data[i];
            for (let j = 0; j < dim; j++) v_new[j] += wi * row[j];
        }

        eigenvalue = norm(v_new);
        if (eigenvalue === 0) break;

        for (let j = 0; j < dim; j++) v[j] = v_new[j] / eigenvalue;
    }

    return { vector: v, eigenvalue };
}

// ─── Word loading computation ────────────────────────────────────

const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "at", "by",
    "with", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "shall", "should", "would", "could",
    "may", "might", "must", "can", "not", "no", "nor", "but", "if", "then",
    "than", "so", "as", "its", "it", "this", "that", "these", "those", "such",
    "any", "all", "each", "every", "both", "few", "more", "most", "other",
    "some", "only", "own", "same", "from", "into", "upon", "about", "between",
    "through", "during", "before", "after", "above", "below", "under", "over",
    "up", "out", "off", "down", "which", "who", "whom", "what", "when", "where",
    "how", "there", "here", "also", "very", "just", "per", "one", "two", "three",
    "section", "chapter", "article", "title", "code", "city", "crescent",
]);

/**
 * Compute word loadings: for each term, compute its correlation with
 * the PC scores. Returns the top terms by combined loading.
 */
export function computeWordLoadings(
    docs: string[],
    projections: number[][], // [docIndex][pcIndex]
    pcs: any[] // Needed? No, just the scores
): WordLoading[] {
    const n = docs.length;
    if (n === 0) return [];

    // Build vocabulary: count term occurrences across docs
    const vocab = new Map<string, number>(); // word → doc count
    const docTokens: string[][] = [];

    for (const doc of docs) {
        const tokens = doc.toLowerCase()
            .replace(/[^a-z\s]/g, " ")
            .split(/\s+/)
            .filter(t => t.length > 2 && !STOPWORDS.has(t));
        docTokens.push(tokens);
        const unique = new Set(tokens);
        for (const w of unique) {
            vocab.set(w, (vocab.get(w) || 0) + 1);
        }
    }

    // Filter vocabulary: keep terms that appear in 3+ docs but less than 80% of docs
    // Filter vocabulary: keep terms that appear in 3+ docs but less than 80% of docs
    // For small datasets, relax these constraints
    const minDocs = n < 5 ? 1 : 3;
    const maxDocs = n < 5 ? n : Math.floor(n * 0.8);
    const terms = [...vocab.entries()]
        .filter(([_, count]) => count >= minDocs && count <= maxDocs)
        .map(([word]) => word);

    if (terms.length === 0) return [];

    // Transpose projections to get scores per PC across all docs
    // pcScores[pcIndex][docIndex]
    const numPCs = projections[0].length;
    const pcScores: number[][] = Array.from({ length: numPCs }, () => new Float64Array(n) as any);
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < numPCs; k++) {
            pcScores[k][i] = projections[i][k];
        }
    }

    // Precompute mean & std for each PC
    const pcMeans = pcScores.map(scores => scores.reduce((s, v) => s + v, 0) / n);
    const pcStds = pcScores.map((scores, i) => Math.sqrt(scores.reduce((s, v) => s + (v - pcMeans[i]) ** 2, 0) / n) || 1);

    const loadings: WordLoading[] = [];

    // Process top 500 terms by doc frequency (skip rest for perf)
    const sortedTerms = terms
        .sort((a, b) => (vocab.get(b) || 0) - (vocab.get(a) || 0))
        .slice(0, 500);

    for (const word of sortedTerms) {
        // Compute TF (binary presence) for this term across docs
        const tf = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            tf[i] = docTokens[i].includes(word) ? 1 : 0;
        }
        const meanTF = tf.reduce((s, v) => s + v, 0) / n;
        const stdTF = Math.sqrt(tf.reduce((s, v) => s + (v - meanTF) ** 2, 0) / n);
        if (stdTF === 0) continue;

        // Pearson correlation with each PC
        const correlations: number[] = [];
        for (let k = 0; k < numPCs; k++) {
            let corr = 0;
            for (let i = 0; i < n; i++) {
                const tNorm = (tf[i] - meanTF) / stdTF;
                const pNorm = (pcScores[k][i] - pcMeans[k]) / pcStds[k];
                corr += tNorm * pNorm;
            }
            correlations.push(Math.round((corr / n) * 1000) / 1000);
        }

        loadings.push({
            word,
            correlations,
        });
    }

    // Sort by sum of absolute correlations (overall importance)
    loadings.sort((a, b) => {
        const sumA = a.correlations.reduce((s, v) => s + Math.abs(v), 0);
        const sumB = b.correlations.reduce((s, v) => s + Math.abs(v), 0);
        return sumB - sumA;
    });

    return loadings.slice(0, 50); // Return top 50 terms
}
