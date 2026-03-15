import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { PlannerAgent } from "../agents/planner-agent.js";
import { ResearcherAgent } from "../agents/researcher-agent.js";
import { QualifierAgent } from "../agents/qualifier-agent.js";
import { WriterAgent } from "../agents/writer-agent.js";

/**
 * Shared state for the sales proposal pipeline.
 * Planner → Researcher (skill: company_research) → Qualifier (skill: lead_qualification) → Writer (skill: proposal_draft).
 */
const StateAnnotation = Annotation.Root({
  userQuery: Annotation(),
  plan: Annotation(),
  companyResearch: Annotation(),
  leadQualification: Annotation(),
  proposalDraft: Annotation(),
});

/**
 * Orchestrator: LangGraph controls workflow; each agent may use skills for capabilities.
 */
export function createGraph(apiKey) {
  const planner = new PlannerAgent(apiKey);
  const researcher = new ResearcherAgent(apiKey);
  const qualifier = new QualifierAgent(apiKey);
  const writer = new WriterAgent(apiKey);

  const graph = new StateGraph(StateAnnotation)
    .addNode("planner", (state) => planner.run(state))
    .addNode("researcher", (state) => researcher.run(state))
    .addNode("qualifier", (state) => qualifier.run(state))
    .addNode("writer", (state) => writer.run(state))
    .addEdge(START, "planner")
    .addEdge("planner", "researcher")
    .addEdge("researcher", "qualifier")
    .addEdge("qualifier", "writer")
    .addEdge("writer", END)
    .compile();

  return {
    graph,
    getInfo: () => ({
      flow: "userQuery → planner → researcher (company_research) → qualifier (lead_qualification) → writer (proposal_draft)",
      agents: [planner, researcher, qualifier, writer].map((a) => a.getInfo()),
    }),
  };
}
