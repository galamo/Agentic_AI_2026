/**
 * Skills registry – reusable capabilities used by agents.
 * LangGraph orchestrates flow; skills provide the abilities.
 */
import * as companyResearch from "./company-research-skill.js";
import * as leadQualification from "./lead-qualification-skill.js";
import * as proposalDraft from "./proposal-draft-skill.js";

export const skills = {
  [companyResearch.name]: companyResearch,
  [leadQualification.name]: leadQualification,
  [proposalDraft.name]: proposalDraft,
};

export async function runSkill(skillName, input) {
  const skill = skills[skillName];
  if (!skill || typeof skill.run !== "function") {
    throw new Error(`Unknown or invalid skill: ${skillName}`);
  }
  return skill.run(input);
}
