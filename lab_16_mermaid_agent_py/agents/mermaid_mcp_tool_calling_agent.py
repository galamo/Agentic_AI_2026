"""
Mermaid MCP Tool-Calling Agent (Python + LangGraph)

This module connects to the Mermaid MCP server (Streamable HTTP),
discovers its tools, wraps them as LangChain StructuredTools, and
uses an LLM tool-calling loop to invoke the right MCP tool(s).
"""

from __future__ import annotations

import json
from typing import Any, Optional

import httpx
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, create_model

from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client

SYSTEM_PROMPT = """You are a Mermaid diagram assistant.

You have access to Mermaid MCP tools. Use them to create, render, or transform
Mermaid diagrams based on the user's request.

When possible, return the Mermaid diagram code in your final answer.
Be concise, but preserve any important diagram details.
"""

MAX_ITERATIONS = 12


def _json_schema_type_to_python_type(schema: Any) -> Any:
    """
    Best-effort mapping of MCP JSON-schema types to Python/Pydantic types.
    This doesn't aim for full JSON Schema coverage; it covers common primitives.
    """
    if not isinstance(schema, dict):
        return Any

    # Handle simple unions: pick the first option.
    any_of = schema.get("anyOf") or schema.get("oneOf")
    if isinstance(any_of, list) and any_of:
        return _json_schema_type_to_python_type(any_of[0])

    t = schema.get("type")
    if not t:
        # Some schemas omit "type" but still define "properties"/"items".
        if "properties" in schema:
            return dict[str, Any]
        if "items" in schema:
            return list[Any]
        return Any

    if t == "string":
        return str
    if t == "number":
        return float
    if t == "integer":
        return int
    if t == "boolean":
        return bool
    if t == "array":
        items = schema.get("items", {})
        item_type = _json_schema_type_to_python_type(items)
        return list[item_type]  # type: ignore[misc]
    if t == "object":
        return dict[str, Any]

    return Any


def _input_schema_to_args_model(tool_name: str, input_schema: Any) -> type[BaseModel]:
    """
    Convert an MCP tool inputSchema (JSON Schema object) to a Pydantic args model.
    """
    properties: dict[str, Any] = {}
    required: set[str] = set()

    if isinstance(input_schema, dict):
        props = input_schema.get("properties")
        if isinstance(props, dict):
            properties = props
        req = input_schema.get("required")
        if isinstance(req, list):
            required = {str(x) for x in req}

    fields: dict[str, tuple[Any, Any]] = {}
    for prop_name, prop_schema in properties.items():
        py_type = _json_schema_type_to_python_type(prop_schema)
        is_required = prop_name in required
        if is_required:
            fields[prop_name] = (py_type, ...)
        else:
            # Optional args default to None
            fields[prop_name] = (Optional[py_type], None)

    # Allow "no args" tools: create an empty model.
    model = create_model(f"{tool_name}_Args", **fields)  # type: ignore[call-overload]
    return model


def _mcp_call_result_to_text(result: Any) -> str:
    """
    Convert MCP call result to plain text (best-effort).

    The Python MCP SDK returns rich result objects. We attempt:
    - `result.content`: list of content parts (often includes text parts)
    - `result.structured_content`: structured output (validated against outputSchema)
    - fallback to JSON/string.
    """
    if result is None:
        return ""

    # Some versions include `is_error`.
    is_error = getattr(result, "is_error", False)
    if is_error:
        err = getattr(result, "error", None)
        if err:
            try:
                return f"Error: {json.dumps(err, indent=2, ensure_ascii=False)}"
            except Exception:
                return f"Error: {err}"
        return "Error: MCP tool call failed."

    structured = getattr(result, "structured_content", None)
    if structured is not None:
        if isinstance(structured, (str, int, float, bool)):
            return str(structured)
        try:
            return json.dumps(structured, indent=2, ensure_ascii=False)
        except Exception:
            return str(structured)

    content = getattr(result, "content", None)
    if content is not None:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            texts: list[str] = []
            for c in content:
                if isinstance(c, str):
                    texts.append(c)
                    continue
                if isinstance(c, dict):
                    if c.get("type") == "text" and c.get("text") is not None:
                        texts.append(str(c["text"]))
                    continue
                c_type = getattr(c, "type", None)
                c_text = getattr(c, "text", None)
                if c_type == "text" and c_text is not None:
                    texts.append(str(c_text))
            if texts:
                return "\n".join(texts)
        try:
            return json.dumps(content, indent=2, ensure_ascii=False)
        except Exception:
            return str(content)

    # Fallback
    try:
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception:
        return str(result)


def _create_llm_from_env(llm_api_key: str) -> ChatOpenAI:
    """
    Create a ChatOpenAI model (OpenRouter if base_url is set).
    """
    # We infer the intended base_url from the presence of OPENROUTER_API_KEY.
    # Callers pass the correct key for the chosen provider.
    # - If using OpenRouter: model id uses openai/gpt-4o-mini and base_url points to OpenRouter.
    # - If using OpenAI: model id uses gpt-4o-mini and base_url is default.
    import os

    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if openrouter_key and llm_api_key == openrouter_key:
        return ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.2,
            api_key=llm_api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost",
                "X-Title": "lab_16_mermaid_agent_py",
            },
        )

    if openai_key and llm_api_key == openai_key:
        return ChatOpenAI(model="gpt-4o-mini", temperature=0.2, api_key=llm_api_key)

    # Fallback: treat as OpenAI-compatible
    return ChatOpenAI(model="gpt-4o-mini", temperature=0.2, api_key=llm_api_key)


async def _run_tool_loop(
    llm: Any,
    tools: list[StructuredTool],
    tools_by_name: dict[str, StructuredTool],
    user_message: str,
) -> str:
    """
    Basic LLM <-> tool loop until the LLM stops requesting tools.
    """
    messages: list[Any] = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]

    response: Any = None
    iterations = 0

    while iterations < MAX_ITERATIONS:
        response = await llm.ainvoke(messages)
        tool_calls = getattr(response, "tool_calls", None) or []
        if not tool_calls:
            break

        messages.append(response)

        for tc in tool_calls:
            name = tc.get("name") or ""
            args = tc.get("args") or {}
            tool_call_id = tc.get("id") or f"call_{name}_{iterations}"

            tool = tools_by_name.get(name)
            if not tool:
                observation = f"Unknown tool requested by model: {name}"
            else:
                try:
                    observation = await tool.ainvoke(args)
                    if not isinstance(observation, str):
                        observation = json.dumps(observation, indent=2, ensure_ascii=False)
                except Exception as e:
                    observation = f"Error calling tool {name}: {e}"

            messages.append(ToolMessage(content=str(observation), tool_call_id=tool_call_id))

        iterations += 1

    final_content = getattr(response, "content", "")
    if isinstance(final_content, str) and final_content.strip():
        return final_content.strip()
    return "(No response)"


def create_mermaid_mcp_agent_node(
    *,
    mcp_mermaid_url: str,
    mcp_mermaid_auth: str,
    llm_api_key: str,
) -> dict[str, Any]:
    """
    Create a LangGraph node wrapper with a `run(state)` method.
    """

    llm_api_key_for_provider = llm_api_key

    async def run(state: dict[str, Any]) -> dict[str, Any]:
        user_message = state.get("user_message") or "Draw a diagram describing the requested architecture."

        async with httpx.AsyncClient(
            headers={
                # The Mermaid MCP authorization in this repo's `mcp.json` is provided as raw value.
                "Authorization": mcp_mermaid_auth,
            }
        ) as http_client:
            # Connect to Mermaid MCP via Streamable HTTP.
            async with streamable_http_client(
                url=mcp_mermaid_url,
                http_client=http_client,
            ) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    list_tools_result = await session.list_tools()

                    mcp_tools = getattr(list_tools_result, "tools", None) or []

                    tools: list[StructuredTool] = []
                    tools_by_name: dict[str, StructuredTool] = {}

                    for t in mcp_tools:
                        name = getattr(t, "name", None) or (t.get("name") if isinstance(t, dict) else None)
                        description = (
                            getattr(t, "description", None)
                            or (t.get("description") if isinstance(t, dict) else None)
                            or ""
                        )
                        input_schema = (
                            getattr(t, "input_schema", None)
                            or getattr(t, "inputSchema", None)
                            or (t.get("inputSchema") if isinstance(t, dict) else None)
                            or None
                        )

                        if not name:
                            continue

                        tool_name = str(name)
                        args_model = _input_schema_to_args_model(tool_name, input_schema)

                        async def _call_mcp_tool(tool_name: str = tool_name, **kwargs: Any) -> str:
                            result = await session.call_tool(name=tool_name, arguments=kwargs or {})
                            return _mcp_call_result_to_text(result)

                        structured_tool = StructuredTool.from_function(
                            name=tool_name,
                            description=str(description),
                            func=_call_mcp_tool,
                            args_schema=args_model,
                        )
                        tools.append(structured_tool)
                        tools_by_name[tool_name] = structured_tool

                    if not tools:
                        return {"final_answer": "Mermaid MCP returned no tools."}

                    llm = _create_llm_from_env(llm_api_key_for_provider)
                    llm_with_tools = llm.bind_tools(tools)

                    final_answer = await _run_tool_loop(
                        llm_with_tools,
                        tools=tools,
                        tools_by_name=tools_by_name,
                        user_message=user_message,
                    )

                    return {
                        "final_answer": final_answer,
                        "mcp_tool_count": len(tools),
                        "mcp_tools": sorted(tools_by_name.keys()),
                    }

    def get_info() -> dict[str, Any]:
        return {
            "name": "MermaidMcpToolCallingAgent",
            "role": "Connects to Mermaid MCP and calls its tools via an LLM tool loop",
        }

    return {"run": run, "get_info": get_info}

