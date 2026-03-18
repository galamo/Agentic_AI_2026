# Lab 14: LangGraph multi-agent + skills – sales proposal pipeline (Python)

This lab is the **Python** version of `lab_14_skills_multiagent`. It shows a multi-agent sales proposal pipeline orchestrated by **LangGraph**, where each agent uses **skills** as reusable capabilities.

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
- **Skills**: Encapsulate reusable workflows (company research, lead qualification, proposal structure). Agents call them; they don't replace the graph.
- **Agents**: Use LLM + skills to read/write shared state.

## Flow

| Step   | Agent      | Skill / role                                      | State written      |
|--------|------------|---------------------------------------------------|--------------------|
| 1      | Planner    | Parse request (no skill)                          | `plan`             |
| 2      | Researcher | `company_research`                                | `companyResearch`  |
| 3      | Qualifier  | `lead_qualification`                              | `leadQualification`|
| 4      | Writer     | `proposal_draft` + LLM personalization            | `proposalDraft`    |

## Skills (reusable capabilities)

- **company_research** – Input: company name, industry hint. Output: summary, industry, size, pain points.
- **lead_qualification** – Input: company, research. Output: BANT-style score, readiness.
- **proposal_draft** – Input: company, research, qualification. Output: proposal sections and template. Writer Agent uses LLM to fill it.

## Setup using a virtual environment (venv)

1. **Create and activate a virtual environment** (from the repo root or this lab folder):

   ```bash
   cd lab_14_skills_multiagent_py
   python3 -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env and set OPENROUTER_API_KEY=...
   ```

## Run

With the venv activated and `OPENROUTER_API_KEY` set:

```bash
python main.py
```

With a custom request:

```bash
python main.py "Prepare a proposal for TechStart Inc in SaaS."
```

## Structure

- `skills/` – Reusable capabilities (`company_research`, `lead_qualification`, `proposal_draft`); `registry.py` exposes `run_skill()`.
- `agents/` – Planner, Researcher, Qualifier, Writer (each may call skills).
- `graph/orchestrator.py` – LangGraph: state, nodes, edges.
- `main.py` – Entry point: run graph, print plan, research, qualification, and proposal.

## Takeaway

- **LangGraph** = workflow and state between agents.
- **Skills** = packaged capabilities agents can reuse.
- **Sales pipeline** = one example; the same pattern applies to support, ops, or other domains.
