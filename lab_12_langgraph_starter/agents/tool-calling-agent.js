/**
 * Tool-calling agent – LLM decides when to call fetch_random_users and compute_statistics.
 * Uses a manual tool loop with model.bindTools() (no langchain/agents). Tools share state
 * so the second tool can use the users fetched by the first.
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { randomUsersApi } from "./fetch-users-agent.js";
import { StatisticsAgent } from "./statistics-agent.js";

const SYSTEM_PROMPT = `You are a statistics assistant. You have two tools:

1. fetch_random_users: Fetches random user profiles from an API. Call this first with the number of users the user wants (e.g. 10, 20, 50). Maximum 100.

2. compute_statistics: Computes aggregations on the users you already fetched. You can request "age", "location", and/or "gender". Call this after fetching users.

Decide based on the user's request:
- If they ask for a report or stats, first fetch users (choose a sensible count if not specified, e.g. 20), then compute the statistics they asked for (or age, location, gender if unspecified).
- If they only ask to fetch users, just call fetch_random_users and summarize what you got.
- Always give a short, clear final answer summarizing the results.`;

const MAX_ITERATIONS = 8;

/**
 * Build tools that share state (last fetched users, last aggregations).
 * @param {Object} shared - Mutable object: { users: Object[]|null, aggregations: Object[]|null }
 * @returns {{ tools: import("@langchain/core/tools").StructuredToolInterface[], shared: Object }}
 */
function createTools(shared) {
  const statsAgent = new StatisticsAgent();

  const fetchRandomUsersTool = new DynamicStructuredTool({
    name: "fetch_random_users",
    description:
      "Fetches random user profiles from the Random User API. Call this first to get user data. Use the count parameter (1-100) for how many users to fetch.",
    schema: z.object({
      count: z
        .number()
        .min(1)
        .max(100)
        .describe("Number of random users to fetch (1-100)"),
    }),
    func: async ({ count }) => {
      const users = await randomUsersApi(count);
      shared.users = users;
      return `Fetched ${users.length} random users. You can now call compute_statistics with the statistic types you need (age, location, gender).`;
    },
  });

  const computeStatisticsTool = new DynamicStructuredTool({
    name: "compute_statistics",
    description:
      "Computes statistics (age buckets, location by country/state, gender) on the users already fetched. Call fetch_random_users first. Choose one or more of: age, location, gender.",
    schema: z.object({
      statisticTypes: z
        .array(z.enum(["age", "location", "gender"]))
        .describe("Which statistics to compute: age, location, gender (one or more)"),
    }),
    func: async ({ statisticTypes }) => {
      if (!shared.users || shared.users.length === 0) {
        return "No users loaded. Call fetch_random_users first with a count, then call compute_statistics again.";
      }
      const aggregations = statsAgent.computeAggregations(shared.users, statisticTypes);
      shared.aggregations = aggregations;
      return JSON.stringify(aggregations, null, 2);
    },
  });

  const tools = [fetchRandomUsersTool, computeStatisticsTool];
  const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
  return { tools, toolsByName, shared };
}

/**
 * Run the tool-calling loop: invoke LLM, execute any tool_calls, re-invoke until no more tool calls.
 * @param {Object} opts
 * @param {import("@langchain/openai").ChatOpenAI} opts.llm
 * @param {Object} opts.toolsByName
 * @param {Object} opts.shared
 * @param {string} userMessage
 * @returns {Promise<{ finalAnswer: string, randomUsers?: Object[], aggregations?: Object[] }>}
 */
async function runToolLoop({ llm, toolsByName, shared }, userMessage) {
  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ];
  let response;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    response = await llm.invoke(messages);
    const toolCalls = response.tool_calls ?? response.additional_kwargs?.tool_calls ?? [];
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      break;
    }
    messages.push(response);
    for (const tc of toolCalls) {
      const name = tc.name ?? tc.function?.name ?? "";
      let args = tc.args;
      if (args === undefined && tc.function?.arguments != null) {
        try {
          args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        } catch {
          args = {};
        }
      }
      args = args ?? {};
      const tool = toolsByName[name];
      const toolCallId = tc.id ?? tc.tool_call_id ?? `call_${name}_${iterations}`;
      let content;
      if (tool) {
        try {
          content = await tool.invoke(args);
          if (typeof content !== "string") content = JSON.stringify(content);
        } catch (err) {
          content = `Error: ${err.message}`;
        }
      } else {
        content = `Unknown tool: ${name}`;
      }
      messages.push(new ToolMessage({ content, tool_call_id: toolCallId }));
    }
    iterations++;
  }

  const finalAnswer = response && typeof response.content === "string" ? response.content : (response?.content ?? "");
  return {
    finalAnswer: finalAnswer.trim() || "(No response)",
    randomUsers: shared.users ?? undefined,
    aggregations: shared.aggregations ?? undefined,
  };
}

/**
 * Creates the tool-calling agent and returns a run function for the LangGraph node.
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ run: (state: Object) => Promise<Object>, getInfo: () => Object }>}
 */
export async function createToolCallingAgentNode(apiKey) {
  const shared = { users: null, aggregations: null };
  const { tools, toolsByName } = createTools(shared);

  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.2,
    openAIApiKey: apiKey,
  }).bindTools(tools);

  return {
    async run(state) {
      const message = state.userMessage ?? "Fetch 20 random users and compute statistics by age, location, and gender.";
      shared.users = null;
      shared.aggregations = null;
      return runToolLoop({ llm, toolsByName, shared }, message);
    },
    getInfo() {
      return {
        name: "ToolCallingAgent",
        role: "LLM agent that decides when to fetch users and compute statistics via tools",
      };
    },
  };
}
