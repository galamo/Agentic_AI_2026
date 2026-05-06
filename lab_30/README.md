# Lab 30 - Skills in Cursor and Claude Code

## What is a Skill?

A **Skill** is a reusable instruction package for an AI coding agent.
It usually contains:

- a clear purpose (what the skill is for),
- step-by-step behavior (how the agent should execute),
- examples and constraints.

Instead of rewriting the same prompt every time, you create a Skill once and reuse it.

---

## Why Skills are useful

- Consistency: same quality and process every run.
- Speed: less repeated prompting.
- Team standardization: everyone uses the same conventions.
- Better autonomy: agent can follow a predefined workflow.

---

## Cursor Skills

In Cursor projects, a common structure is:

```text
.cursor/
  skills/
    my-skill/
      SKILL.md
```

### Minimal `SKILL.md` template

```md
# Skill: My Skill Name

## When to use
- Use this skill when ...

## Inputs expected
- ...

## Steps
1. ...
2. ...
3. ...

## Output format
- ...

## Guardrails
- Do not ...
```

### How to build a Skill in Cursor

1. Create a folder under `.cursor/skills/`.
2. Add `SKILL.md`.
3. Write:
   - Trigger/usage condition (`When to use`),
   - Exact execution process (`Steps`),
   - Output requirements (`Output format`),
   - Limits/safety (`Guardrails`).
4. Keep it specific and test it on a real task.
5. Refine based on failures and edge cases.

### Using Skills in Cursor

#### Manual usage

- Ask the agent to apply a specific skill (for example: "use the dockerizing-node-js skill").
- Or give a task that clearly matches that skill's purpose.

#### Automatic usage

- If the agent detects your task matches a known skill, it can load and follow it automatically.
- Better auto-selection happens when the skill has a precise "When to use" section.

---

## Claude Code Skills

Claude Code also supports reusable workflow instructions, typically organized as project files.
Teams often keep them in a dedicated folder such as:

```text
.claude/
  skills/
    my-skill/
      SKILL.md
```

> Note: exact layout can vary by team tooling/version. Follow your local project convention if it differs.

### How to build a Skill for Claude Code

1. Create a skills directory in your project convention.
2. Add a markdown skill file (`SKILL.md`).
3. Include:
   - when to use it,
   - required inputs,
   - deterministic steps,
   - expected output format,
   - constraints.
4. Keep instructions concrete and testable.

### Using Skills in Claude Code

#### Manual usage

- Explicitly reference the skill in your prompt.
- Example: "Use the API request skill for this task."

#### Automatic usage

- Claude can select a skill when task intent matches the skill definition.
- Strong naming + clear trigger conditions improve automatic activation.

---

## Best practices for both Cursor and Claude Code

- One skill = one responsibility.
- Prefer checklists and numbered steps.
- Include success criteria ("done means ...").
- Add anti-patterns ("do not do ...").
- Keep skills short, concrete, and versioned.
- Update skill docs when process changes.

---

## Quick checklist

- [ ] Skill has a clear "When to use"
- [ ] Inputs are documented
- [ ] Steps are ordered and testable
- [ ] Output format is explicit
- [ ] Guardrails are defined
- [ ] At least one real-world example is included

---

## Example mini skill

```md
# Skill: API Bug Reproduction

## When to use
- Bug report includes endpoint + payload.

## Inputs expected
- Base URL, endpoint, headers, payload.

## Steps
1. Reproduce with curl or axios.
2. Capture status code + response body.
3. Compare actual vs expected behavior.
4. Propose minimal fix and test case.

## Output format
- Reproduction command
- Observed result
- Root cause
- Fix plan
```

