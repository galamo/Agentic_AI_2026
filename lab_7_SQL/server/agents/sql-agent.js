/**
 * SQL Agent (agent mode)
 * Same interface as sql-generator.js but uses a LangChain agent with tools:
 * - get_schema: returns the retrieved schema context so the agent can reason over it
 * Output: SQL query only (and optionally parameters)
 */
import { DynamicTool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";

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

const SYSTEM_PROMPT = `You are a PostgreSQL expert. Your job is to write a valid PostgreSQL SELECT query for the user's question.

You have access to the tool get_schema: use it to retrieve the relevant database schema (tables and columns). Then write exactly one SELECT statement.

Rules:
- Use only tables/columns from the schema returned by get_schema.
- Prefer JOINs over subqueries when listing related data.
- Use table aliases if helpful (e.g. u for users, p for permissions).
- Your final answer must be ONLY the SQL statement: no explanation, no markdown, no code block wrapper.
- Do not use INSERT, UPDATE, DELETE, or DDL. Only SELECT.`;

/**
 * Builds tools that close over the given schema context.
 * @param {string} schemaContext
 * @returns {import("@langchain/core/tools").StructuredToolInterface[]}
 */
function createTools(schemaContext) {
  const getSchemaTool = new DynamicTool({
    name: "get_schema",
    description:
      "Returns the relevant database schema (tables, columns, types) to use for writing SQL. Call this to see available tables and columns before writing your query.",
    func: async () => schemaContext,
  });
  return [getSchemaTool];
}

/**
 * Strips markdown code fences and extra whitespace from the agent's final answer.
 * @param {string} raw
 * @returns {string}
 */
function extractSQL(raw) {
  if (!raw || typeof raw !== "string") return "";
  let sql = raw
    .replace(/^```\w*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  return sql;
}

/**
 * Same interface as sql-generator.generateSQL: question + schema context → { sql, parameters }.
 * Uses an agent that can call get_schema and then produce the SQL.
 *
 * @param {string} question
 * @param {string} schemaContext
 * @returns {Promise<{ sql: string, parameters?: any[] }>}
 */
export async function generateSQLWithAgent(question, schemaContext) {
  const model = createModel();
  const tools = createTools(schemaContext);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = createToolCallingAgent({
    llm: model,
    tools,
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
    returnIntermediateSteps: false,
    maxIterations: 5,
    handleParsingErrors: true,
  });

  const result = await executor.invoke({ input: question });
  const rawOutput = result.output ?? "";
  const sql = extractSQL(rawOutput);

  return { sql, parameters: [] };
}
