import subprocess
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any
import os

logger = logging.getLogger(__name__)

class MCPClient:
    """MCP client for Contentstack integration"""
    
    def __init__(self):
        self.mcp_command = "npx"
        self.mcp_args = ["-y", "@contentstack/mcp"]
        self.api_key = os.getenv("CONTENTSTACK_API_KEY")
        self.delivery_token = os.getenv("CONTENTSTACK_DELIVERY_TOKEN")
        self.management_token = os.getenv("CONTENTSTACK_MANAGEMENT_TOKEN")
        self.environment = os.getenv("CONTENTSTACK_ENVIRONMENT", "development")
        self.launch_project_id = os.getenv("CONTENTSTACK_LAUNCH_PROJECT_ID")
        
    async def initialize_connection(self) -> bool:
        """Initialize MCP connection with Contentstack"""
        try:
            # Test MCP connection
            result = await self._execute_mcp_command("test", {})
            return result is not None
        except Exception as e:
            logger.error(f"Failed to initialize MCP connection: {e}")
            return False
    
    async def fetch_content(self, content_type: str, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch content via MCP Delivery API"""
        try:
            params = {
                "content_type": content_type,
                "environment": self.environment,
                "api_key": self.api_key,
                "delivery_token": self.delivery_token
            }
            
            if query:
                params["query"] = query
            
            result = await self._execute_mcp_command("fetch_content", params)
            return result.get("entries", []) if result else []
            
        except Exception as e:
            logger.error(f"Error fetching content via MCP: {e}")
            return []
    
    async def create_draft_content(self, content_type: str, title: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create draft content via MCP CMA API"""
        try:
            params = {
                "content_type": content_type,
                "title": title,
                "data": data,
                "environment": self.environment,
                "api_key": self.api_key,
                "management_token": self.management_token
            }
            
            result = await self._execute_mcp_command("create_draft_content", params)
            return result
            
        except Exception as e:
            logger.error(f"Error creating draft content via MCP: {e}")
            return None
    
    async def search_content(self, query: str, content_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Search content across multiple content types"""
        try:
            params = {
                "query": query,
                "environment": self.environment,
                "api_key": self.api_key,
                "delivery_token": self.delivery_token
            }
            
            if content_types:
                params["content_types"] = content_types
            
            result = await self._execute_mcp_command("search_content", params)
            return result.get("entries", []) if result else []
            
        except Exception as e:
            logger.error(f"Error searching content via MCP: {e}")
            return []
    
    async def get_content_types(self) -> List[Dict[str, Any]]:
        """Get available content types"""
        try:
            params = {
                "api_key": self.api_key,
                "delivery_token": self.delivery_token
            }
            
            result = await self._execute_mcp_command("get_content_types", params)
            return result.get("content_types", []) if result else []
            
        except Exception as e:
            logger.error(f"Error fetching content types via MCP: {e}")
            return []
    
    async def _execute_mcp_command(self, command: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Execute MCP command with parameters"""
        try:
            cmd = [self.mcp_command] + self.mcp_args + [command, json.dumps(params)]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return json.loads(stdout.decode())
            else:
                logger.error(f"MCP command failed: {stderr.decode()}")
                return None
                
        except Exception as e:
            logger.error(f"Error executing MCP command: {e}")
            return None

# Global MCP client instance
mcp_client = MCPClient()
