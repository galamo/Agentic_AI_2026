# Lab 13 — MCP server (Python): calculate, test, fetch_page_html, get_page_inputs

Python MCP server with four tools: **calculate**, **test**, **fetch_page_html**, and **get_page_inputs**. Uses Streamable HTTP so you can connect from another machine (MCP client) and from **n8n** as an agent tool. This is the Python equivalent of the Node.js `lab_13_mcp` server.

## Tools and payload

| Tool              | Description                                      | Payload (MCP `tools/call` arguments) |
|-------------------|--------------------------------------------------|--------------------------------------|
| `calculate`       | Math on two numbers                              | `{ "a": number, "b": number, "operation": "add" \| "subtract" \| "multiply" \| "divide" }` |
| `test`            | Echo a message (connection check)               | `{ "message"?: string }` (optional)  |
| `fetch_page_html` | Fetch a URL and return raw HTML                 | `{ "url": string }` (valid URL)      |
| `get_page_inputs` | Open URL in headless browser, return form inputs | `{ "url": string }` (valid URL)      |

Example JSON-RPC call (what an MCP client sends to `POST /mcp`):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": { "a": 10, "b": 5, "operation": "add" }
  }
}
```

---

## Running the server with a virtual environment (venv)

Using a **venv** keeps this lab’s dependencies isolated from the rest of your system.

### 1. Create and activate the venv

From the **project root** (e.g. `Agentic_AI_2026`), or from **this lab folder** (`lab_13_mcp_py`):

```bash
# From repo root:
cd lab_13_mcp_py

# Create virtual environment (only once)
python3 -m venv .venv

# Activate it (do this every time you open a new terminal for this lab)
# On macOS/Linux:
source .venv/bin/activate

# On Windows (Command Prompt):
# .venv\Scripts\activate.bat

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

After activation, your prompt usually shows `(.venv)`.

### 2. Install dependencies

With the venv **activated**:

```bash
pip install -r requirements.txt
```

### 3. (Optional) Configure host and port

```bash
cp .env.example .env
# Edit .env if you want: MCP_HOST=0.0.0.0, MCP_PORT=3513
```

### 4. Run the MCP server

With the venv **activated**:

```bash
python mcp_server.py
```

Default: **http://0.0.0.0:3513** (all interfaces), so other systems can connect.

- **MCP endpoint:** `POST http://<host>:3513/mcp`
- Use this URL in an MCP client or n8n.

### 5. Deactivate the venv when done

```bash
deactivate
```

---

## One-liner (create venv + install + run)

From inside `lab_13_mcp_py`:

```bash
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python mcp_server.py
```

(On Windows, replace `source .venv/bin/activate` with `.venv\Scripts\activate` or use PowerShell’s `Activate.ps1`.)

---

## Alternative: run with `uv`

If you use [uv](https://docs.astral.sh/uv/), you can skip creating a venv yourself:

```bash
cd lab_13_mcp_py
uv venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
python mcp_server.py
```

Or with `uv run` (uv manages the environment for you):

```bash
uv run python mcp_server.py
```

---

## Connect from another system (MCP client)

1. Use the **Streamable HTTP** transport.
2. Set the server URL to: **`http://<lab13-server-ip>:3513/mcp`**  
   Example: `http://192.168.1.100:3513/mcp` if this server runs on `192.168.1.100`.
3. Ensure the firewall allows TCP port **3513** on the server host.

## Use with n8n (agent tool)

1. In n8n, add an **MCP** or **AI Agent** node that supports MCP servers.
2. Set the MCP server URL to: **`http://<host>:3513/mcp`**
   - Same machine: `http://localhost:3513/mcp`
   - n8n in Docker: `http://host.docker.internal:3513/mcp` if the server is on the host.
3. The agent will see **calculate**, **test**, **fetch_page_html**, and **get_page_inputs** and can call them.

---

## Requirements

- **Python 3.10+**
- **Chrome/Chromium** for the `get_page_inputs` tool (Selenium uses ChromeDriver; the MCP server will use the system’s Chrome/Chromium in headless mode).
