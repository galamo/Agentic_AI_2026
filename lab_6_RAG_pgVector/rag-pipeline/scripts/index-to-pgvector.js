/**
 * RAG pipeline: index a list of TXT files (e.g. constructor pricing) into pgvector.
 * Run from rag-pipeline folder: npm run index  (or npm run run:index)
 *
 * Requires: Postgres with pgvector on port 5432 (user/password/db: langchain).
 * Set OPENAI_API_KEY in .env for embeddings.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DATA_PATH = path.join(__dirname, "..", "data");
const TABLE_NAME = "constructor_pricing_vectors";

function getDataPath() {
  const envPath = process.env.DATA_PATH;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return DEFAULT_DATA_PATH;
}

/**
 * Load all .txt files from a directory and return Document[].
 * @param {string} dirPath
 * @returns {Document[]}
 */
function loadTxtFiles(dirPath) {
  const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    throw new Error(`Data path is not a directory: ${absolutePath}`);
  }
  const files = fs.readdirSync(absolutePath).filter((f) => f.endsWith(".txt"));
  const documents = [];
  for (const file of files) {
    const filePath = path.join(absolutePath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    documents.push(
      new Document({
        pageContent: content,
        metadata: { source: filePath, filename: file },
      })
    );
  }
  return documents;
}

/**
 * Split documents into chunks (by section/paragraph) for better retrieval.
 * @param {Document[]} documents
 * @param {object} options - chunkSize (chars), chunkOverlap (chars)
 * @returns {Document[]}
 */
function splitDocuments(documents, options = {}) {
  const { chunkSize = 800, chunkOverlap = 100 } = options;
  const result = [];
  for (const doc of documents) {
    const text = doc.pageContent;
    const sections = text.split(/(?=\n## )|\n\n+/).filter((s) => s.trim());
    let current = "";
    for (const section of sections) {
      if (current.length + section.length > chunkSize && current.length > 0) {
        result.push(
          new Document({ pageContent: current.trim(), metadata: { ...doc.metadata } })
        );
        const overlap = current.slice(-chunkOverlap);
        current = overlap + "\n" + section;
      } else {
        current = (current ? current + "\n\n" : "") + section;
      }
    }
    if (current.trim()) {
      result.push(
        new Document({ pageContent: current.trim(), metadata: { ...doc.metadata } })
      );
    }
  }
  return result.length ? result : documents;
}

async function main() {
  const dataPath = getDataPath();
  console.log("Loading TXT files from:", dataPath);

  const rawDocs = loadTxtFiles(dataPath);
  if (rawDocs.length === 0) {
    console.warn("No .txt files found in", dataPath);
    process.exit(0);
  }
  console.log("Loaded", rawDocs.length, "file(s)");

  const splitDocs = splitDocuments(rawDocs);
  console.log("Split into", splitDocs.length, "chunks");

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
  }
  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const embeddings = new OpenAIEmbeddings(
    {
      model: useOpenRouter ? "openai/text-embedding-3-small" : "text-embedding-3-small",
      apiKey,
    },
    useOpenRouter ? { basePath: "https://openrouter.ai/api/v1" } : undefined
  );

  const host = process.env.PG_HOST || "127.0.0.1";
  const port = Number(process.env.PG_PORT || "5432");
  const user = process.env.PG_USER || "langchain";
  const password = process.env.PG_PASSWORD || "langchain";
  const database = process.env.PG_DATABASE || "langchain";

  console.log("Connecting to Postgres (pgvector) at", `${host}:${port}/${database}...`);

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

  const ids = splitDocs.map(() => uuidv4());
  await vectorStore.addDocuments(splitDocs, { ids });

  console.log("Indexed", splitDocs.length, "chunks into table", TABLE_NAME);
  await vectorStore.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
