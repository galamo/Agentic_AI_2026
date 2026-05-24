/**
 * LangGraph wiring:
 *
 *            ┌─► vectorRag ─┐
 *   START ──►│              ├─► comparator ─► END
 *            └─► graphRag  ─┘
 *
 * The two RAG branches share the user query but write to disjoint state keys
 * so they can run in parallel. The comparator asks the LLM to point out
 * concrete differences between the two answers.
 */
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { VectorRagAgent } from "../agents/vector-rag-agent.js";
import { GraphRagAgent } from "../agents/graph-rag-agent.js";

const State = Annotation.Root({
  userQuery: Annotation(),
  vectorContext: Annotation(),
  vectorAnswer: Annotation(),
  graphCypher: Annotation(),
  graphContext: Annotation(),
  graphAnswer: Annotation(),
  comparison: Annotation(),
});

export function createRagGraph({ apiKey, model, graphStore }) {
  const vectorAgent = new VectorRagAgent({ apiKey, model });
  const graphAgent = new GraphRagAgent({ apiKey, model, graphStore });

  const comparatorLlm = new ChatOpenAI({
    modelName: model,
    temperature: 0,
    configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey },
  });

  const compare = async (state) => {
    const sys = new SystemMessage(
      "Compare two answers to the same question, produced by two retrieval " +
      "strategies (vector similarity vs graph traversal). In 3-5 short bullets, " +
      "explain: which answer is more complete, which facts each one missed, and " +
      "why the underlying retrieval strategy caused that gap. Be concrete."
    );
    const human = new HumanMessage(
      `Question: ${state.userQuery}\n\n` +
      `--- Vector RAG answer ---\n${state.vectorAnswer}\n\n` +
      `--- Graph RAG answer ---\n${state.graphAnswer}`
    );
    const resp = await comparatorLlm.invoke([sys, human]);
    return { comparison: typeof resp.content === "string" ? resp.content : String(resp.content) };
  };

  const graph = new StateGraph(State)
    .addNode("vectorRag", (s) => vectorAgent.run(s))
    .addNode("graphRag",  (s) => graphAgent.run(s))
    .addNode("comparator", compare)
    .addEdge(START, "vectorRag")
    .addEdge(START, "graphRag")
    .addEdge("vectorRag", "comparator")
    .addEdge("graphRag", "comparator")
    .addEdge("comparator", END)
    .compile();

  return { graph };
}
