/**
 * Callback handler that writes AgentExecutor verbose output to a text file.
 * Same events as ConsoleCallbackHandler but appends to a file (no ANSI codes).
 */
import fs from "fs";
import path from "path";
import { BaseTracer } from "@langchain/core/tracers/base";

function tryJsonStringify(obj, fallback) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return fallback;
  }
}

function formatKVMapItem(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return String(value);
  return tryJsonStringify(value, value.toString());
}

function elapsed(run) {
  if (!run.end_time) return "";
  const ms = run.end_time - run.start_time;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export class VerboseFileHandler extends BaseTracer {
  /**
   * @param {string} filePath - Absolute or relative path to the log file (e.g. agent-executor-log.txt)
   */
  constructor(filePath) {
    super();
    this.filePath = path.resolve(filePath);
    this.name = "verbose_file_handler";
  }

  persistRun() {
    return Promise.resolve();
  }

  getParents(run) {
    const parents = [];
    let currentRun = run;
    while (currentRun.parent_run_id) {
      const parent = this.runMap.get(currentRun.parent_run_id);
      if (parent) {
        parents.push(parent);
        currentRun = parent;
      } else break;
    }
    return parents;
  }

  getBreadcrumbs(run) {
    const parents = this.getParents(run).reverse();
    return [...parents, run]
      .map((parent, i, arr) => {
        const name = `${parent.execution_order}:${parent.run_type}:${parent.name}`;
        return i === arr.length - 1 ? `**${name}**` : name;
      })
      .join(" > ");
  }

  /** @param {string} line */
  writeLine(line) {
    const withNewline = line.endsWith("\n") ? line : line + "\n";
    fs.appendFileSync(this.filePath, withNewline, "utf8");
  }

  onChainStart(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[chain/start] [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, "[inputs]")}`);
  }

  onChainEnd(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[chain/end] [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(run.outputs, "[outputs]")}`);
  }

  onChainError(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[chain/error] [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
  }

  onLLMStart(run) {
    const crumbs = this.getBreadcrumbs(run);
    const inputs = "prompts" in run.inputs
      ? { prompts: run.inputs.prompts.map((p) => p.trim()) }
      : run.inputs;
    this.writeLine(`[llm/start] [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, "[inputs]")}`);
  }

  onLLMEnd(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[llm/end] [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(run.outputs, "[response]")}`);
  }

  onLLMError(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[llm/error] [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
  }

  onToolStart(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[tool/start] [${crumbs}] Entering Tool run with input: "${formatKVMapItem(run.inputs?.input)}"`);
  }

  onToolEnd(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[tool/end] [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${formatKVMapItem(run.outputs?.output)}"`);
  }

  onToolError(run) {
    const crumbs = this.getBreadcrumbs(run);
    this.writeLine(`[tool/error] [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
  }

  onAgentAction(run) {
    const agentRun = run;
    const crumbs = this.getBreadcrumbs(run);
    const action = agentRun.actions?.[agentRun.actions.length - 1];
    this.writeLine(`[agent/action] [${crumbs}] Agent selected action: ${tryJsonStringify(action, "[action]")}`);
  }
}
