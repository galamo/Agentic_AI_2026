/**
 * Minimal in-memory vector store using TF-IDF + cosine similarity.
 *
 * Production systems would use proper dense embeddings (OpenAI, Cohere, Jina,
 * local sentence-transformers). TF-IDF is intentional here: it has no API
 * dependency and makes the "lexical match" nature of vector retrieval obvious
 * when contrasted with graph traversal.
 */

const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","of","in","on","at",
  "to","for","and","or","but","with","by","from","as","that","this","it","its",
  "who","whom","what","which","where","when","how","why","does","do","did","has",
  "have","had","s","u",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; const w = b.get(k); if (w) dot += v * w; }
  for (const [, v] of b) nb += v * v;
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class VectorStore {
  constructor() {
    this.docs = [];        // { id, text, tokens }
    this.df = new Map();   // token → document frequency
    this.idf = new Map();  // token → idf weight
  }

  add(texts) {
    for (const text of texts) {
      const tokens = tokenize(text);
      const id = this.docs.length;
      this.docs.push({ id, text, tokens });
      const seen = new Set(tokens);
      for (const t of seen) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    const N = this.docs.length;
    this.idf = new Map();
    for (const [t, df] of this.df) this.idf.set(t, Math.log((N + 1) / (df + 1)) + 1);
    this.vectors = this.docs.map((d) => this._weight(d.tokens));
  }

  _weight(tokens) {
    const tf = termFreq(tokens);
    const v = new Map();
    for (const [t, f] of tf) {
      const idf = this.idf.get(t) || 0;
      if (idf) v.set(t, f * idf);
    }
    return v;
  }

  /** Returns top-k {text, score} matches for the query. */
  search(query, k = 4) {
    const qVec = this._weight(tokenize(query));
    const scored = this.vectors.map((v, i) => ({
      text: this.docs[i].text,
      score: cosine(qVec, v),
    }));
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
