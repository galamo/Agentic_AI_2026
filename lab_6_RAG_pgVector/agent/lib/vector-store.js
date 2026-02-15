/**
 * Vector store connection for the QA agent.
 * Connects to the same pgvector table used by rag-pipeline (constructor_pricing_vectors).
 */

import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const TABLE_NAME = "constructor_pricing_vectors";

/**
 * Build embeddings with the same model and config as the index pipeline
 * (so query vectors are compatible with stored vectors).
 */
export function getEmbeddings() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
  }
  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  return new OpenAIEmbeddings(
    {
      model: useOpenRouter ? "openai/text-embedding-3-small" : "text-embedding-3-small",
      apiKey,
    },
    useOpenRouter ? { basePath: "https://openrouter.ai/api/v1" } : undefined
  );
}

/**
 * Connect to the existing pgvector table (same as rag-pipeline).
 * @returns {Promise<PGVectorStore>}
 */
export async function getVectorStore() {
  const host = process.env.PG_HOST || "127.0.0.1";
  const port = Number(process.env.PG_PORT || "5432");
  const user = process.env.PG_USER || "langchain";
  const password = process.env.PG_PASSWORD || "langchain";
  const database = process.env.PG_DATABASE || "langchain";

  const embeddings = getEmbeddings();
  const vectorStore = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: {
      type: "postgres",
      host,
      port,
      user,
      password,
      database,
    },
    tableName: TABLE_NAME,
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
  return vectorStore;
}

/**
 * Get a retriever that queries the vector DB.
 * @param {number} k - Number of chunks to retrieve
 * @returns {Promise<VectorStoreRetriever>}
 */
export async function getRetriever(k = 6) {
  const vectorStore = await getVectorStore();
  return vectorStore.asRetriever(k);
}
