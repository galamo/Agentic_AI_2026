"""
Build LangChain tools from an MCP client session (list_tools + call_tool).
Uses langchain_mcp_adapters.load_mcp_tools.
"""
from langchain_mcp_adapters import load_mcp_tools

__all__ = ["load_mcp_tools"]
