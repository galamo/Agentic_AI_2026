/**
 * QA agent: receives a message, embeds the query, retrieves from pgvector,
 * answers using OpenRouter (or OpenAI).
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getRetriever } from "../lib/vector-store.js";
import "dotenv/config";

const SYSTEM_PROMPT = `You are a construction pricing assistant. You have access to a pricing reference stored in a vector database (excerpts are provided below).

Your task:
- Answer the user's question about construction or renovation costs using ONLY the provided pricing reference.
- If the question matches a line item, give the price or range and the unit (e.g. per linear metre, per m²).
- If the question is vague (e.g. "how much for a bathroom?"), list the relevant items from the reference (demolition, rough-in, finish, fixtures) and their ranges.
- If something has no matching line in the reference, say so and do not invent a number.
- Be concise and direct. Quote ranges exactly as in the reference when possible.
- If no answer or item exists in the pricing reference, answer with "I don't know - call Yakir."`;

function createChatModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      temperature: 0.1,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
      },
    });
  }

  if (openaiKey) {
    return new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
    });
  }

  throw new Error(
    "Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env for the QA agent."
  );
}

/**
 * Answer a single question using the vector DB.
 * @param {object} options
 * @param {string} options.message - User question/message
 * @param {number} [options.k=6] - Number of chunks to retrieve
 * @returns {Promise<string>} Model answer
 */
export async function answer({ message, k = 6 }) {
  const retriever = await getRetriever(k);
  const docs = await retriever.invoke(message);
  const context = docs.map((d) => d.pageContent).join("\n\n---\n\n");

  const model = createChatModel();
  const messages = [
    new SystemMessage({
      content:
        SYSTEM_PROMPT +
        "\n\nPricing reference (excerpts from vector DB):\n\n" +
        (context || "(No relevant chunks found. Say you have no pricing data for this question.)"),
    }),
    new HumanMessage({ content: message }),
  ];

  const response = await model.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");
}

/**
 * Create a QA agent that reuses one retriever for multiple questions.
 * @param {number} [k=6] - Number of chunks to retrieve per question
 * @returns {Promise<{ answer: (message: string) => Promise<string> }>}
 */
export async function createQAAgent(k = 6) {
  const retriever = await getRetriever(k);
  return {
    answer: (message) => answerWithRetriever(message, retriever),
  };
}

async function answerWithRetriever(message, retriever) {
  const docs = await retriever.invoke(message);
  const context = docs.map((d) => d.pageContent).join("\n\n---\n\n");

  const model = createChatModel();
  const messages = [
    new SystemMessage({
      content:
        SYSTEM_PROMPT +
        "\n\nPricing reference (excerpts from vector DB):\n\n" +
        (context || "(No relevant chunks found. Say you have no pricing data for this question.)"),
    }),
    new HumanMessage({ content: message }),
  ];

  const response = await model.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");
}
