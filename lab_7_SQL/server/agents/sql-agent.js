/**
 * SQL Agent (agent mode)
 * Same interface as sql-generator.js but uses a LangChain agent with tools:
 * - get_schema: returns the retrieved schema context so the agent can reason over it
 * Output: SQL query only (and optionally parameters)
 */
import path from "path";
import { fileURLToPath } from "url";
import { DynamicTool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import fs from "fs";
import { VerboseFileHandler } from "./verbose-file-handler.js";

process.env.TZ = "UTC";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Log file for executor verbose output (project root: lab_7_SQL) */
const VERBOSE_LOG_PATH = path.resolve(__dirname, "..", "..", "agent-executor-log.txt");

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

You have access to these tools:
- get_schema: use it to retrieve the relevant database schema (tables and columns).
- get_current_datetime: use it when the question involves "today", "now", "current date/time", "tomorrow", "yesterday", or any relative date/time. It returns the actual current date and time so you can write correct WHERE conditions.

After using the tools you need, write exactly one SELECT statement.

Rules:
- Use only tables/columns from the schema returned by get_schema.
- For date/time filters, call get_current_datetime and use the returned values (e.g. date_today, date_tomorrow, datetime_now) in your SQL—do not guess or invent dates.
- Prefer JOINs over subqueries when listing related data.
- Use table aliases if helpful (e.g. u for users, p for permissions).
- Your final answer must be ONLY the SQL statement: no explanation, no markdown, no code block wrapper.
- Do not use INSERT, UPDATE, DELETE, or DDL. Only SELECT.`;
// make this prompt better
/**
 * Returns current date/time for use in SQL (today, tomorrow, now).
 * Call this when the user question involves relative dates or times.
 * @returns {string}
 */
function getCurrentDateTimeContext() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fmt = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  const fmtDateTime = (d) => d.toISOString().slice(0, 19).replace("T", " "); // YYYY-MM-DD HH:MM:SS

  return [
    `date_today: ${fmt(today)} (use for "today", "current date")`,
    `date_tomorrow: ${fmt(tomorrow)} (use for "tomorrow")`,
    `date_yesterday: ${fmt(yesterday)} (use for "yesterday")`,
    `datetime_now: ${fmtDateTime(now)} (use for "now", "current time")`,
    `time_now: ${now.toISOString().slice(11, 19)} (HH:MM:SS)`,
  ].join("\n");
}

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

  const getCurrentDateTimeTool = new DynamicTool({
    name: "get_current_datetime",
    description:
      "Returns the current date and time (today, tomorrow, yesterday, now) in formats ready for SQL. Call this when the user asks about 'today', 'now', 'current date', 'tomorrow', 'yesterday', or any relative date/time so you can write correct WHERE conditions.",
    func: async () => getCurrentDateTimeContext(),
  });

  return [getSchemaTool, getCurrentDateTimeTool];
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
    verbose: true,
    returnIntermediateSteps: false,
    maxIterations: 5, // 10 // 20 // 30 improve prompt vs increase iterations 
    handleParsingErrors: true,
    
  });

  const runStarted = new Date().toISOString();
  fs.appendFileSync(
    VERBOSE_LOG_PATH,
    `\n=== Executor run ${runStarted} | question: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""} ===\n`,
    "utf8"
  );
  const result = await executor.invoke(
    { input: question },
    { callbacks: [new VerboseFileHandler(VERBOSE_LOG_PATH)] }
  );
  const rawOutput = result.output ?? "";
  const sql = extractSQL(rawOutput);

  return { sql, parameters: [] };
}
