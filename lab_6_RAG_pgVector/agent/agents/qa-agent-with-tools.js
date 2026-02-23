/**
 * QA agent using LangChain's native agent with tools.
 *
 * Same behavior as qa-agent.js (construction pricing assistant over pgvector),
 * but implemented as an agent that has a "search_pricing_reference" tool.
 * The LLM decides when to call the tool and then answers from the results.
 *
 * Uses: createOpenAIFunctionsAgent + AgentExecutor from langchain/agents.
 */

import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { z } from "zod";
import { getRetriever } from "../lib/vector-store.js";

const SYSTEM_PROMPT = `You are a construction pricing assistant. You have access to a tool that searches a pricing reference stored in a vector database.

Your task:
- When the user asks about construction or renovation costs, use the search_pricing_reference tool to get relevant excerpts, then answer using ONLY that content.
- If the question matches a line item, give the price or range and the unit (e.g. per linear metre, per m²).
- If the question is vague (e.g. "how much for a bathroom?"), use the tool and list the relevant items from the reference (demolition, rough-in, finish, fixtures) and their ranges.
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
 * Build the pricing search tool that uses the vector store retriever.
 * @param {number} k - Number of chunks to retrieve per search
 * @returns {Promise<DynamicStructuredTool>}
 */
async function createSearchPricingTool(k = 6) {
  const retriever = await getRetriever(k);

  return new DynamicStructuredTool({
    name: "search_pricing_reference",
    description: `Search the construction pricing reference (vector DB) for line items, costs, and ranges. Use this whenever the user asks about prices, costs, or renovation/construction rates. Returns relevant excerpts from the pricing database.`,
    schema: z.object({
      query: z
        .string()
        .describe(
          "Search query: topic or question about pricing (e.g. 'bathroom renovation', 'demolition cost per m2', 'tiling')"
        ),
    }),
    func: async ({ query }) => {
      const docs = await retriever.invoke(query);
      const context = docs.map((d) => d.pageContent).join("\n\n---\n\n");
      return context || "(No relevant chunks found in the pricing reference.)";
    },
  });
}

/**
 * Create the LangChain agent executor with the pricing search tool.
 * @param {object} [options]
 * @param {number} [options.k=6] - Number of chunks to retrieve per tool call
 * @param {boolean} [options.verbose=true] - Log agent steps
 * @returns {Promise<AgentExecutor>}
 */
export async function createQAAgentWithTools({ k = 6, verbose = true } = {}) {
  const searchTool = await createSearchPricingTool(k);
  const llm = createChatModel();

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: [searchTool],
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools: [searchTool],
    verbose,
    maxIterations: 5,
    returnIntermediateSteps: false,
  });

  return agentExecutor;
}

/**
 * Answer a single question using the agent (tool-based).
 * @param {object} options
 * @param {string} options.message - User question
 * @param {number} [options.k=6] - Chunks per tool call
 * @param {boolean} [options.verbose=false] - Log steps
 * @returns {Promise<string>}
 */
export async function answerWithAgent({ message, k = 6, verbose = false }) {
  const executor = await createQAAgentWithTools({ k, verbose });
  const result = await executor.invoke({ input: message });
  return result.output ?? String(result.output);
}
