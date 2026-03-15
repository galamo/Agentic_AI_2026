# Lab 14: LangGraph multi-agent + skills – sales proposal pipeline

This lab shows a **real-world sales example**: a multi-agent pipeline orchestrated by **LangGraph**, where each agent uses **skills** as reusable capabilities.

## Architecture

```
User: "Prepare a proposal for Acme Corp in manufacturing"
        ↓
   Planner Agent      (parses request → companyName, industryHint, steps)
        ↓
   Research Agent     (skill: company_research → summary, industry, pain points)
        ↓
   Qualifier Agent    (skill: lead_qualification → BANT score, readiness)
        ↓
   Writer Agent       (skill: proposal_draft → structure; LLM → personalized proposal)
        ↓
   proposalDraft
```

- **LangGraph**: Controls workflow (nodes and edges); state flows between agents.
- **Skills**: Encapsulate reusable workflows (company research, lead qualification, proposal structure). Agents call them; they don’t replace the graph.
- **Agents**: Use LLM + skills to read/write shared state.

## Flow

| Step   | Agent      | Skill / role                                      | State written      |
|--------|------------|---------------------------------------------------|--------------------|
| 1      | Planner    | Parse request (no skill)                          | `plan`             |
| 2      | Researcher | `company_research`                                | `companyResearch`  |
| 3      | Qualifier  | `lead_qualification`                              | `leadQualification`|
| 4      | Writer     | `proposal_draft` + LLM personalization            | `proposalDraft`    |

## Skills (reusable capabilities)

- **company_research** – Input: company name, industry hint. Output: summary, industry, size, pain points. (In production: CRM/API/RAG.)
- **lead_qualification** – Input: company, research. Output: BANT-style score, readiness. (In production: CRM, scoring engine, or LLM over call notes.)
- **proposal_draft** – Input: company, research, qualification. Output: proposal sections and template. Writer Agent uses LLM to fill it.

## Setup

```bash
cd lab_14_skills_multiagent
npm install
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY=...
```

## Run

```bash
npm start
```

With a custom request:

```bash
node index.js "Prepare a proposal for TechStart Inc in SaaS."
```

## Structure

- `skills/` – Reusable capabilities (company_research, lead_qualification, proposal_draft).
- `agents/` – Planner, Researcher, Qualifier, Writer (each may call skills).
- `graph/orchestrator.js` – LangGraph: state, nodes, edges.
- `index.js` – Entry point: run graph, print plan, research, qualification, and proposal.

## Takeaway

- **LangGraph** = workflow and state between agents.
- **Skills** = packaged capabilities agents can reuse.
- **Sales pipeline** = one example; the same pattern applies to support, ops, or other domains.
