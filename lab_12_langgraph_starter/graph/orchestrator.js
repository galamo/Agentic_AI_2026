import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { createToolCallingAgentNode } from "../agents/tool-calling-agent.js";

/**
 * Shared state for the graph:
 * - userMessage: natural language request (e.g. "Fetch 30 users and give me age and location stats")
 * - finalAnswer: LLM's final response after tool calls
 * - randomUsers: result from fetch_random_users tool (if called)
 * - aggregations: result from compute_statistics tool (if called)
 */
const StateAnnotation = Annotation.Root({
  userMessage: Annotation(),
  finalAnswer: Annotation(),
  randomUsers: Annotation(),
  aggregations: Annotation(),
});

/**
 * Orchestrator: compiles a LangGraph with a single LLM agent that has tools.
 *   START → agent (LLM decides when to call fetch_random_users / compute_statistics) → END
 * The model decides how many users to fetch and which statistics to compute.
 */
export async function createGraph(apiKey) {
  const agentNode = await createToolCallingAgentNode(apiKey);

  const graph = new StateGraph(StateAnnotation)
    .addNode("agent", (state) => agentNode.run(state))
    .addEdge(START, "agent")
    .addEdge("agent", END)
    .compile();

  return {
    graph,
    getInfo: () => ({
      agents: [agentNode.getInfo()],
      flow: "userMessage → agent (LLM + tools: fetch_random_users, compute_statistics) → END",
    }),
  };
}
