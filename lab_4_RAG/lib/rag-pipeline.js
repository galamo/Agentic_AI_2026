/**
 * RAG pipeline: load pricing TXT into memory and expose a retriever.
 * Uses in-memory vector store (MemoryVectorStore) for retrieval.
 * Designed so a separate "pricing check" agent can use the same retriever later.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PRICING_PATH = path.join(__dirname, "..", "data", "pricing.txt");

/**
 * Load pricing text file and return as a single Document.
 * @param {string} filePath - Path to pricing .txt file
 * @returns {Promise<Document[]>}
 */
export async function loadPricingFile(filePath = DEFAULT_PRICING_PATH) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(absolutePath, "utf-8");
  return [
    new Document({
      pageContent: content,
      metadata: { source: absolutePath },
    }),
  ];
}

/**
 * Split documents into smaller chunks for better retrieval (by section/paragraph).
 * @param {Document[]} documents
 * @param {object} options - chunkSize (chars), chunkOverlap (chars)
 * @returns {Promise<Document[]>}
 */
export async function splitDocuments(documents, options = {}) {
  const { chunkSize = 800, chunkOverlap = 100 } = options;
  const result = [];
  for (const doc of documents) {
    const text = doc.pageContent;
    // Prefer splitting on section headers or double newline
    const sections = text.split(/(?=\n## )|\n\n+/).filter((s) => s.trim());
    let current = "";
    for (const section of sections) {
      if (current.length + section.length > chunkSize && current.length > 0) {
        result.push(new Document({ pageContent: current.trim(), metadata: { ...doc.metadata } }));
        const overlap = current.slice(-chunkOverlap);
        current = overlap + "\n" + section;
      } else {
        current = (current ? current + "\n\n" : "") + section;
      }
    }
    if (current.trim()) {
      result.push(new Document({ pageContent: current.trim(), metadata: { ...doc.metadata } }));
    }
  }
  return result.length ? result : documents;
}

/**
 * Build in-memory vector store from pricing documents and return retriever.
 * @param {string} [pricingFilePath] - Path to pricing .txt
 * @param {object} [embeddingOptions] - passed to OpenAIEmbeddings
 * @returns {Promise<{ vectorStore: MemoryVectorStore, retriever: Retriever }>}
 */
export async function buildPricingRAG(pricingFilePath = DEFAULT_PRICING_PATH, embeddingOptions = {}) {
  const docs = await loadPricingFile(pricingFilePath);
  const splitDocs = await splitDocuments(docs);

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = openRouterKey || openaiKey;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
  }

  const useOpenRouter = Boolean(openRouterKey);
  const embeddings = new OpenAIEmbeddings(
    {
      model: useOpenRouter ? "openai/text-embedding-3-small" : "text-embedding-3-small",
      apiKey,
      ...embeddingOptions,
    },
    useOpenRouter ? { basePath: "https://openrouter.ai/api/v1" } : undefined
  );

  const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  const retriever = vectorStore.asRetriever({ k: 6 });

  return { vectorStore, retriever };
}

/**
 * Retrieve relevant pricing snippets for a query (e.g. "remove wall", "bathroom").
 * @param {Retriever} retriever - from buildPricingRAG
 * @param {string} query
 * @param {number} k
 * @returns {Promise<Document[]>}
 */
export async function getRelevantPricing(retriever, query, k = 6) {
  return retriever.invoke(query, { k });
}
