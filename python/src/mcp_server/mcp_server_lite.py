"""
Archon MCP Server - LITE VERSION
Minimal token footprint with only essential tools
"""

import os
import sys
from pathlib import Path
from mcp.server.fastmcp import FastMCP

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

from src.server.services.mcp_service_client import get_mcp_service_client

mcp = FastMCP("archon-lite")

@mcp.tool()
async def list_tasks(filter_by: str = None, filter_value: str = None) -> str:
    """List tasks"""
    client = await get_mcp_service_client()
    return await client.call_service("api", "GET", "/api/tasks", params={
        "filter_by": filter_by,
        "filter_value": filter_value
    })

@mcp.tool()
async def update_task(task_id: str, status: str = None, **kwargs) -> str:
    """Update task status"""
    client = await get_mcp_service_client()
    return await client.call_service("api", "PUT", f"/api/tasks/{task_id}", 
                                    json={"status": status, **kwargs})

@mcp.tool()
async def perform_rag_query(query: str, match_count: int = 5) -> str:
    """Search knowledge base"""
    client = await get_mcp_service_client()
    return await client.call_service("api", "POST", "/api/knowledge/search", 
                                    json={"query": query, "match_count": match_count})

@mcp.tool() 
async def get_project(project_id: str) -> str:
    """Get project details"""
    client = await get_mcp_service_client()
    return await client.call_service("api", "GET", f"/api/projects/{project_id}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(mcp.run(
        transport="http",
        host="0.0.0.0",
        port=int(os.getenv("ARCHON_MCP_PORT", 8051))
    ))