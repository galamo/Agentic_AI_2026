/**
 * Router Agent: decides whether to answer via HTML RAG (simple questions)
 * or via the SQL agent (data/database questions).
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

function createModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      temperature: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey },
    });
  }
  if (openaiKey) {
    return new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  }
  throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
}

const ROUTER_PROMPT = `You are a router. Given the user's message, decide which agent should handle it.

- "html_rag": Simple questions about general knowledge, documentation, definitions, how-to, or content that can be answered from documentation/web pages. Examples: "What is SSO?", "How does login work?", "What are the project guidelines?"
- "sql_agent": Questions that require querying a database (lists, counts, who has what, filtering data). Examples: "How many users?", "List all permissions", "Which users have permission X?"

Reply with exactly one word: html_rag or sql_agent. No other text.`;

/**
 * Decide route for the user question.
 * @param {string} question
 * @returns {Promise<'html_rag' | 'sql_agent'>}
 */
export async function route(question) {
  const model = createModel();
  const messages = [
    new SystemMessage({ content: ROUTER_PROMPT }),
    new HumanMessage({ content: question }),
  ];
  const response = await model.invoke(messages);
  const raw = typeof response.content === "string"
    ? response.content
    : response.content?.map((c) => (c.type === "text" ? c.text : "")).join("") || "";
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("sql_agent") || normalized.includes("sql")) return "sql_agent";
  return "html_rag";
}
