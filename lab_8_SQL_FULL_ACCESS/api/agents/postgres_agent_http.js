/**
 * PostgreSQL agent: uses MCP over HTTP (Streamable HTTP).
 * Connects to postgres MCP server at POSTGRES_MCP_URL, gets tools, runs LangChain agent.
 */
import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getMcpToolsAsLangChain } from "../lib/mcp-tools.js";

const POSTGRES_MCP_URL = process.env.POSTGRES_MCP_URL || "http://127.0.0.1:3101/mcp";
const LOG_PREFIX = "[Agent]";

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
 * Run the agent for one question. Creates a new MCP client per call (stateless).
 * @param {string} question
 * @returns {Promise<{ answer: string }>}
 */
export async function runPostgresAgentHttp(question) {
  console.log(`${LOG_PREFIX} Connecting to MCP at ${POSTGRES_MCP_URL}`);
  const transport = new StreamableHTTPClientTransport(new URL(POSTGRES_MCP_URL));
  const client = new Client(
    { name: "lab8-postgres-agent", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  console.log(`${LOG_PREFIX} MCP client connected`);

  try {
    console.log(`${LOG_PREFIX} Fetching MCP tools...`);
    const tools = await getMcpToolsAsLangChain(client);
    console.log(`${LOG_PREFIX} Got ${tools?.length ?? 0} tool(s):`, tools?.map((t) => t.name) ?? []);
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
    console.log(`${LOG_PREFIX} Invoking executor for question: "${question.slice(0, 60)}${question.length > 60 ? "..." : ""}"`);
    const result = await executor.invoke({ input: question });
    console.log(`${LOG_PREFIX} Executor finished, output length: ${result.output?.length ?? 0}`);
    return { answer: result.output };
  } finally {
    await transport.close();
    console.log(`${LOG_PREFIX} MCP transport closed`);
  }
}
