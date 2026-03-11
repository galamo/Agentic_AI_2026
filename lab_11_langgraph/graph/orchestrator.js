import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ResearcherAgent } from "../agents/researcher-agent.js";
import { WriterAgent } from "../agents/writer-agent.js";
import dotenv from "dotenv";
dotenv.config();
/**
 * Shared state for the graph: one agent produces researchNotes,
 * the other consumes them and produces finalAnswer.
 */
const StateAnnotation = Annotation.Root({
  userQuery: Annotation(),
  researchNotes: Annotation(),
  finalAnswer: Annotation(),
});

/**
 * Orchestrator that compiles a LangGraph where:
 *   START → researcher → writer → END
 * Agents communicate by reading/writing the shared state.
 */
export function createGraph(apiKey) {
  const researcher = new ResearcherAgent(apiKey);
  const writer = new WriterAgent(apiKey);

  const researcherNode = async (state) => {
    return researcher.run(state);
  };

  const writerNode = async (state) => {
    return writer.run(state);
  };

  const graph = new StateGraph(StateAnnotation)
    .addNode("researcher", researcherNode)
    .addNode("writer", writerNode)
    .addEdge(START, "researcher")
    .addEdge("researcher", "writer")
    .addEdge("writer", END)
    .compile();

  return {
    graph,
    getInfo: () => ({
      agents: [researcher.getInfo(), writer.getInfo()],
      flow: "userQuery → researcher (researchNotes) → writer (finalAnswer)",
    }),
  };
}
