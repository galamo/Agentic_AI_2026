"""
Lab 13 MCP server (Python): tools "calculate", "test", "fetch_page_html", "get_page_inputs".
Single server instance; Streamable HTTP is stateless per request.

Run with: python mcp_server.py
Or: uv run python mcp_server.py (after uv add mcp[cli])
"""
import json
import os
from typing import Literal

import requests
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

load_dotenv()

LOG_PREFIX = "[lab13-mcp-py]"
MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.environ.get("MCP_PORT", "3513"), 10)

# Stateless HTTP with JSON responses (matches Node version behavior)
mcp = FastMCP(
    "lab13-mcp",
    stateless_http=True,
    json_response=True,
    host=MCP_HOST,
    port=MCP_PORT,
)


@mcp.tool()
def calculate(
    a: float,
    b: float,
    operation: Literal["add", "subtract", "multiply", "divide"],
) -> str:
    """Perform a math operation on two numbers. Use for addition, subtraction, multiplication, or division."""
    try:
        num_a, num_b = float(a), float(b)
    except (TypeError, ValueError):
        return "Error: both a and b must be numbers."

    if operation == "add":
        result = num_a + num_b
    elif operation == "subtract":
        result = num_a - num_b
    elif operation == "multiply":
        result = num_a * num_b
    elif operation == "divide":
        if num_b == 0:
            return "Error: division by zero."
        result = num_a / num_b
    else:
        return f'Error: unknown operation "{operation}".'

    print(f"{LOG_PREFIX} calculate {num_a} {operation} {num_b} = {result}")
    return str(result)


@mcp.tool()
def test(message: str | None = None) -> str:
    """Simple test tool that echoes a message. Use this to verify the MCP connection works (e.g. from MCP client or n8n)."""
    text = (
        f"Test tool received: {message}"
        if message
        else "Test tool called successfully. MCP connection is working."
    )
    print(f'{LOG_PREFIX} test message="{message or "(none)"}"')
    return text


@mcp.tool()
def fetch_page_html(url: str) -> str:
    """Fetch a given URL and return the raw HTML of the page. Use this to get the static HTML content of a webpage."""
    try:
        resp = requests.get(url, timeout=30, allow_redirects=True)
        resp.raise_for_status()
        html = resp.text
        print(f"{LOG_PREFIX} fetch_page_html {url} -> {len(html)} chars")
        return html
    except requests.RequestException as e:
        msg = str(e) if hasattr(e, "message") else str(e)
        print(f"{LOG_PREFIX} fetch_page_html error: {msg}")
        return f"Error fetching {url}: {msg}"


@mcp.tool()
def get_page_inputs(url: str) -> str:
    """Open the given URL in a headless browser (Selenium) and return only the relevant form inputs: input, textarea, and select elements with their name, id, type, placeholder, and associated labels."""
    driver = None
    try:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        driver = webdriver.Chrome(options=options)
        driver.get(url)

        elements = driver.find_elements(By.CSS_SELECTOR, "input, textarea, select")
        result = []

        for el in elements:
            tag = el.tag_name.lower()
            name = el.get_attribute("name")
            id_attr = el.get_attribute("id")
            type_attr = el.get_attribute("type")
            if not type_attr and tag == "textarea":
                type_attr = "textarea"
            if not type_attr and tag == "select":
                type_attr = "select"
            if not type_attr:
                type_attr = "text"
            placeholder = el.get_attribute("placeholder")
            value = el.get_attribute("value")
            label = None
            if id_attr:
                try:
                    label_el = driver.find_element(By.CSS_SELECTOR, f'label[for="{id_attr}"]')
                    label = label_el.text
                except Exception:
                    pass
            result.append({
                "tag": tag,
                "name": name,
                "id": id_attr,
                "type": type_attr or "text",
                "placeholder": placeholder,
                "value": value,
                "label": label,
            })

        print(f"{LOG_PREFIX} get_page_inputs {url} -> {len(result)} inputs")
        return json.dumps(result, indent=2)
    except Exception as e:
        msg = str(e)
        print(f"{LOG_PREFIX} get_page_inputs error: {msg}")
        return f"Error getting inputs from {url}: {msg}"
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass


if __name__ == "__main__":
    print(f"Lab 13 MCP server (Python) at http://{MCP_HOST}:{MCP_PORT}")
    print("  MCP endpoint: POST /mcp (use this URL in MCP client or n8n)")
    mcp.run(transport="streamable-http")
