/**
 * PostgreSQL agent: uses MCP over stdio (spawns mcp-server as subprocess).
 * Set POSTGRES_MCP_STDIO_CWD to the mcp-server directory (default: ../mcp-server from api).
 */
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getMcpToolsAsLangChain } from "../lib/mcp-tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultCwd = path.resolve(__dirname, "..", "..", "mcp-server");
const MCP_STDIO_CWD = process.env.POSTGRES_MCP_STDIO_CWD || defaultCwd;

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

const SYSTEM_PROMPT = `You are a PostgreSQL expert with full access to the database via tools.
Use the tools to discover schemas and tables when needed, then run SQL to answer the user.
- Prefer list_schemas then list_tables(schema) to see structure; use describe_table(schema, table) for columns.
- Execute queries with sql_execute(sql, params). Use parameterized queries ($1, $2, ...) when you have parameters.
- Answer in natural language based on the results.`;

/**
 * Create a connected MCP client over stdio (spawns mcp-server/server-stdio.js).
 * Caller must call transport.close() when done.
 */
async function connectStdioClient() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server-stdio.js"],
    cwd: MCP_STDIO_CWD,
    env: {
      ...process.env,
      PG_HOST: process.env.PG_HOST || "127.0.0.1",
      PG_PORT: process.env.PG_PORT || "5434",
      PG_USER: process.env.PG_USER || "sso_user",
      PG_PASSWORD: process.env.PG_PASSWORD || "sso_pass",
      PG_DATABASE: process.env.PG_DATABASE || "sso_db",
    },
  });
  const client = new Client(
    { name: "lab8-postgres-agent-stdio", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  return { client, transport };
}

/**
 * Run the agent for one question using MCP over stdio.
 * @param {string} question
 * @returns {Promise<{ answer: string }>}
 */
export async function runPostgresAgentStdio(question) {
  const { client, transport } = await connectStdioClient();

  try {
    const tools = await getMcpToolsAsLangChain(client);
    const llm = createModel();
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      verbose: Boolean(process.env.VERBOSE),
      maxIterations: 10,
    });
    const result = await executor.invoke({ input: question });
    return { answer: result.output };
  } finally {
    await transport.close();
  }
}
