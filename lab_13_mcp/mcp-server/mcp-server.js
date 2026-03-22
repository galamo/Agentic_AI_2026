/**
 * Lab 13 MCP server: tools "calculate" and "test".
 * Single server instance; reuse for all connections (Streamable HTTP is stateless per request).
 *
 * Payload (MCP tools/call):
 * - calculate: { name: "calculate", arguments: { a: number, b: number, operation: "add"|"subtract"|"multiply"|"divide" } }
 * - test:      { name: "test",      arguments: { message?: string } }
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Builder, By } from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome.js";

const LOG_PREFIX = "[lab13-mcp]";

const server = new McpServer({
  name: "lab13-mcp",
  version: "1.0.0",
});
// --- Tool: calculate ---
// Payload: { a: number, b: number, operation: "add" | "subtract" | "multiply" | "divide" }
server.registerTool(
  "calculate",
  {
    title: "Calculate",
    description:
      "Yakir see this calvulate tool? a math operation on two numbers. Use for addition, subtraction, multiplication, or division.",
    inputSchema: {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("Operation: add, subtract, multiply, or divide"),
    },
  },
  async ({ a, b, operation }) => {
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      return { content: [{ type: "text", text: "Error: both a and b must be numbers." }] };
    }
    let result;
    switch (operation) {
      case "add":
        result = numA + numB;
        break;
      case "subtract":
        result = numA - numB;
        break;
      case "multiply":
        result = numA * numB;
        break;
      case "divide":
        if (numB === 0) {
          return { content: [{ type: "text", text: "Error: division by zero." }] };
        }
        result = numA / numB;
        break;
      default:
        return { content: [{ type: "text", text: `Error: unknown operation "${operation}".` }] };
    }
    console.log(`${LOG_PREFIX} calculate ${numA} ${operation} ${numB} = ${result}`);
    return {
      content: [{ type: "text", text: String(result) }],
    };
  }
);
// --- Tool: test ---
// Payload: { message?: string } — optional message to echo back (for connection checks)
server.registerTool(
  "test",
  {
    title: "Test",
    description:
      "Simple test tool that echoes a message. Use this to verify the MCP connection works (e.g. from MCP client or n8n).",
    inputSchema: {
      message: z.string().optional().describe("Optional message to echo back"),
    },
  },
  async ({ message }) => {
    const text = message
      ? `Test tool received: ${message}`
      : "Test tool called successfully. MCP connection is working.";
    console.log(`${LOG_PREFIX} test message="${message ?? "(none)"}"`);
    return {
      content: [{ type: "text", text }],
    };
  }
);
// --- Tool: fetch_page_html ---
// Payload: { url: string } — fetch the page and return its HTML
server.registerTool(
  "fetch_page_html",
  {
    title: "Fetch page HTML",
    description:
      "Fetch a given URL and return the raw HTML of the page. Use this to get the static HTML content of a webpage.",
    inputSchema: {
      url: z.string().url().describe("The URL of the page to fetch (e.g. https://example.com)"),
    },
  },
  async ({ url }) => {
    try {
      const res = await fetch(url, {
        redirect: "follow",
      });
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `Error: HTTP ${res.status} ${res.statusText} for ${url}` }],
        };
      }
      
      const html = await res.text();
      console.log(`${LOG_PREFIX} fetch_page_html ${url} -> ${html.length} chars`);
      return {
        content: [{ type: "text", text: html }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} fetch_page_html error:`, msg);
      return {
        content: [{ type: "text", text: `Error fetching ${url}: ${msg}` }],
      };
    }
  }
);
// --- Tool: get_page_inputs ---
// Payload: { url: string } — open with Selenium and return form inputs (input, textarea, select)
server.registerTool(
  "get_page_inputs",
  {
    title: "Get page inputs",
    description:
      "Open the given URL in a headless browser (Selenium) and return only the relevant form inputs from the page: input, textarea, and select elements with their name, id, type, placeholder, and associated labels.",
    inputSchema: {
      url: z.string().url().describe("The URL of the page to open (e.g. https://example.com/form)"),
    },
  },
  async ({ url }) => {
    let driver;
    try {
      const options = new chrome.Options();
      options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu");

      driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

      await driver.get(url);

      const inputs = await driver.findElements(By.css("input, textarea, select"));
      const result = [];

      for (const el of inputs) {
        const tagName = await el.getTagName();
        const name = await el.getAttribute("name").catch(() => null);
        const id = await el.getAttribute("id").catch(() => null);
        const type = await el.getAttribute("type").catch(() => (tagName === "textarea" ? "textarea" : null));
        const placeholder = await el.getAttribute("placeholder").catch(() => null);
        let value = null;
        try {
          value = await el.getAttribute("value");
        } catch {
          // ignore
        }
        let label = null;
        if (id) {
          try {
            const labelEl = await driver.findElement(By.css(`label[for="${id}"]`));
            label = await labelEl.getText();
          } catch {
            // no associated label
          }
        }
        result.push({
          tag: tagName,
          name,
          id,
          type: type || (tagName === "select" ? "select" : "text"),
          placeholder,
          value: value || undefined,
          label: label || undefined,
        });
      }

      await driver.quit();
      console.log(`${LOG_PREFIX} get_page_inputs ${url} -> ${result.length} inputs`);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      if (driver) {
        try {
          await driver.quit();
        } catch {
          // ignore
        }
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} get_page_inputs error:`, msg);
      return {
        content: [{ type: "text", text: `Error getting inputs from ${url}: ${msg}` }],
      };
    }
  }
);

export { server };




