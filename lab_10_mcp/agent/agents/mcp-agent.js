/**
 * Agent that connects to the Lab 10 MCP server via HTTP (Streamable HTTP).
 * Fetches tools from the MCP and runs a LangChain agent. When asked "what kind of tools
 * do you have?", the agent answers based on the tools it received from the MCP.
 */
import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getMcpToolsAsLangChain } from "../lib/mcp-tools.js";

const MCP_URL = process.env.MCP_URL || "http://127.0.0.1:3111/mcp";
const LOG_PREFIX = "[Agent]";

function createModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-5.2",
      temperature: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey },
    });
  }
  if (openaiKey) {
    return new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  }
  throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
}

const SYSTEM_PROMPT = `You are a helpful assistant with access to tools provided by an MCP (Model Context Protocol) server.
When the user asks what kind of tools you have, what tools are available, or similar questions, list and describe the tools you have access to based on their names and descriptions. You know these tools because they were loaded from the MCP server.
For other requests, use the appropriate tool when needed and answer in natural language.`;

/**
 * Run the agent for one question. Creates a new MCP client per call (stateless).
 * @param {string} question
 * @returns {Promise<{ answer: string }>}
 */
export async function runMcpAgent(question) {
  console.log(`${LOG_PREFIX} Connecting to MCP at ${MCP_URL}`);
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client(
    { name: "lab10-mcp-agent", version: "1.0.0" },
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
    const agent = createToolCallingAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      verbose: Boolean(process.env.VERBOSE),
      maxIterations: 10,
      returnIntermediateSteps: true,
    });
    console.log(`${LOG_PREFIX} Invoking executor for: "${question.slice(0, 60)}${question.length > 60 ? "..." : ""}"`);
    const result = await executor.invoke({ input: question });
    console.log(`${LOG_PREFIX} Executor finished`);
    let answer = (result.output ?? "").trim();
    if (!answer && result.intermediateSteps?.length) {
      const lastStep = result.intermediateSteps[result.intermediateSteps.length - 1];
      const observation = lastStep?.[1];
      if (typeof observation === "string" && observation.trim()) {
        answer = observation.trim();
      }
    }
    return { answer };
  } finally {
    await transport.close();
    console.log(`${LOG_PREFIX} MCP transport closed`);
  }
}
