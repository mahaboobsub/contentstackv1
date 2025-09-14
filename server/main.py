#!/usr/bin/env python3
"""
FastAPI server for ContentIQ Python services
Exposes LLM, MCP, and Analytics services to Node.js backend
"""

import os
import asyncio
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

# Import our services
from services.llm_service import llm_service
from services.mcp_client import mcp_client
from services.analytics_service import analytics_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="ContentIQ Services", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatMessage(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    messages: List[ChatMessage]
    content_context: Optional[List[Dict[str, Any]]] = None
    stream: bool = False

class ContentGapAnalysisRequest(BaseModel):
    query: str
    available_content: List[Dict[str, Any]]

class CreateDraftRequest(BaseModel):
    content_type: str
    title: str
    data: Dict[str, Any]

class TrackQueryRequest(BaseModel):
    session_id: str
    query: str
    response_time_ms: float
    success: bool

class TrackContentGapRequest(BaseModel):
    query: str
    gap_data: Dict[str, Any]

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "contentiq-python"}

# LLM Service Endpoints
@app.post("/api/llm/generate")
async def generate_response(request: GenerateRequest):
    """Generate AI response (non-streaming)"""
    try:
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        response_chunks = []
        async for chunk in llm_service.generate_response(
            messages_dict, 
            request.content_context or [], 
            stream=False
        ):
            response_chunks.append(chunk)
        
        return response_chunks[-1] if response_chunks else {"error": "No response generated"}
        
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/llm/generate/stream")
async def generate_response_stream(request: GenerateRequest):
    """Generate AI response (streaming)"""
    try:
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        async def stream_generator():
            async for chunk in llm_service.generate_response(
                messages_dict, 
                request.content_context or [], 
                stream=True
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        
        return StreamingResponse(
            stream_generator(), 
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
        
    except Exception as e:
        logger.error(f"LLM streaming error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/llm/analyze-content-gap")
async def analyze_content_gap(request: ContentGapAnalysisRequest):
    """Analyze content gap for a query"""
    try:
        result = await llm_service.analyze_content_gap(request.query, request.available_content)
        return result
    except Exception as e:
        logger.error(f"Content gap analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# MCP Client Endpoints
@app.get("/api/mcp/content/{content_type}")
async def fetch_content(content_type: str, query: Optional[str] = None):
    """Fetch content from Contentstack CMS"""
    try:
        result = await mcp_client.fetch_content(content_type, query or "")
        return result
    except Exception as e:
        logger.error(f"MCP fetch content error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mcp/search")
async def search_content(query: str, content_types: Optional[List[str]] = None):
    """Search content in Contentstack CMS"""
    try:
        result = await mcp_client.search_content(query, content_types or [])
        return result
    except Exception as e:
        logger.error(f"MCP search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mcp/create-draft")
async def create_draft_content(request: CreateDraftRequest):
    """Create draft content in Contentstack CMS"""
    try:
        result = await mcp_client.create_draft_content(
            request.content_type, 
            request.title, 
            request.data
        )
        return result
    except Exception as e:
        logger.error(f"MCP create draft error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Analytics Service Endpoints
@app.post("/api/analytics/track-query")
async def track_query(request: TrackQueryRequest):
    """Track a chat query"""
    try:
        await analytics_service.track_query(
            request.session_id,
            request.query,
            request.response_time_ms,
            request.success
        )
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Analytics track query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/track-content-gap")
async def track_content_gap(request: TrackContentGapRequest):
    """Track a content gap"""
    try:
        await analytics_service.track_content_gap(request.query, request.gap_data)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Analytics track content gap error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Get analytics summary"""
    try:
        result = await analytics_service.get_analytics_summary()
        return result
    except Exception as e:
        logger.error(f"Analytics summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/trends")
async def get_query_trends(days: int = 7):
    """Get query trends"""
    try:
        result = await analytics_service.get_query_trends(days)
        return result
    except Exception as e:
        logger.error(f"Analytics trends error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/top-queries")
async def get_top_queries(limit: int = 10):
    """Get top queries"""
    try:
        result = await analytics_service.get_top_queries(limit)
        return result
    except Exception as e:
        logger.error(f"Analytics top queries error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/content-gaps")
async def get_content_gaps():
    """Get content gaps"""
    try:
        result = await analytics_service.get_content_gaps()
        return result
    except Exception as e:
        logger.error(f"Analytics content gaps error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)