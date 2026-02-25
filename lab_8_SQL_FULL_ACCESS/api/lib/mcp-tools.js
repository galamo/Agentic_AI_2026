/**
 * Build LangChain tools from an MCP client (tools/list + tools/call).
 * Each tool wraps client.callTool(name, arguments) and returns the text content.
 */
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * @param {import("@modelcontextprotocol/sdk").Client} mcpClient - Connected MCP client
 * @returns {Promise<import("@langchain/core/tools").StructuredToolInterface[]>}
 */
export async function getMcpToolsAsLangChain(mcpClient) {
  const { tools } = await mcpClient.listTools();
  return tools.map((t) => {
    const name = t.name;
    const description = t.description ?? `Call MCP tool: ${name}`;
    const schema = mcpInputSchemaToZod(t.inputSchema);
    return new DynamicStructuredTool({
      name,
      description,
      schema,
      func: async (args) => {
        const result = await mcpClient.callTool({ name, arguments: args });
        const texts = (result.content || [])
          .filter((c) => c.type === "text")
          .map((c) => c.text);
        return texts.join("\n") || JSON.stringify(result);
      },
    });
  });
}

/**
 * Convert MCP tool inputSchema (JSON Schema) to a simple Zod object.
 * Supports: string, number, boolean, array (of any), object (optional props).
 */
function mcpInputSchemaToZod(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== "object") {
    return z.object({});
  }
  const props = jsonSchema.properties;
  const required = new Set(jsonSchema.required || []);
  if (!props || typeof props !== "object") {
    return z.object({});
  }
  const shape = {};
  for (const [key, prop] of Object.entries(props)) {
    if (!prop || typeof prop !== "object") {
      shape[key] = z.any().optional().nullable();
      continue;
    }
    let field = z.any();
    switch (prop.type) {
      case "string":
        field = z.string();
        break;
      case "number":
      case "integer":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      case "array":
        field = z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]));
        break;
      case "object":
        field = z.record(z.any());
        break;
      default:
        field = z.any();
    }
    if (!required.has(key)) {
      field = field.optional().nullable();
    }
    shape[key] = field;
  }
  return z.object(shape);
}
