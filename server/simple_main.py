#!/usr/bin/env python3
"""
Simplified FastAPI server for ContentIQ Python services
Focus on LLM integration while services are being set up
"""

import os
import asyncio
import logging
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="ContentIQ Services (Simplified)", version="1.0.0")

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

# Initialize LLM clients
groq_api_key = os.getenv("GROQ_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

groq_client = None
openai_client = None

if groq_api_key:
    try:
        import openai
        groq_client = openai.AsyncOpenAI(
            api_key=groq_api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        logger.info("Groq client initialized")
    except Exception as e:
        logger.warning(f"Groq initialization failed: {e}")

if openai_api_key:
    try:
        import openai
        openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        logger.info("OpenAI client initialized")
    except Exception as e:
        logger.warning(f"OpenAI initialization failed: {e}")

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "contentiq-python-simplified",
        "groq_available": groq_client is not None,
        "openai_available": openai_client is not None
    }

async def generate_with_groq(messages, stream=False):
    """Generate response using Groq"""
    if not groq_client:
        raise Exception("Groq client not available")
        
    response = await groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": msg["role"], "content": msg["content"]} for msg in messages],
        temperature=0.7,
        max_tokens=1024,
        stream=stream
    )
    
    if stream:
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield {
                    "chunk": chunk.choices[0].delta.content,
                    "done": False,
                    "provider": "groq"
                }
        yield {"chunk": "", "done": True, "provider": "groq"}
    else:
        content = response.choices[0].message.content
        yield {"chunk": content, "done": True, "provider": "groq"}

async def generate_with_openai(messages, stream=False):
    """Generate response using OpenAI"""
    if not openai_client:
        raise Exception("OpenAI client not available")
        
    response = await openai_client.chat.completions.create(
        model="gpt-4",  # Using stable model
        messages=[{"role": msg["role"], "content": msg["content"]} for msg in messages],
        temperature=0.7,
        max_tokens=1024,
        stream=stream
    )
    
    if stream:
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield {
                    "chunk": chunk.choices[0].delta.content,
                    "done": False,
                    "provider": "openai"
                }
        yield {"chunk": "", "done": True, "provider": "openai"}
    else:
        content = response.choices[0].message.content
        yield {"chunk": content, "done": True, "provider": "openai"}

async def generate_response_with_fallback(messages, stream=False):
    """Generate response with Groq primary, OpenAI fallback"""
    # Try Groq first
    try:
        if groq_client:
            async for chunk in generate_with_groq(messages, stream):
                yield chunk
            return
    except Exception as e:
        logger.warning(f"Groq failed, trying OpenAI: {e}")
    
    # Fallback to OpenAI
    try:
        if openai_client:
            async for chunk in generate_with_openai(messages, stream):
                yield chunk
            return
    except Exception as e:
        logger.error(f"Both providers failed: {e}")
    
    # Both failed
    yield {
        "chunk": "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
        "done": True,
        "error": True
    }

# LLM Service Endpoints
@app.post("/api/llm/generate")
async def generate_response(request: GenerateRequest):
    """Generate AI response (non-streaming)"""
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Add system prompt for ContentIQ
        system_message = {
            "role": "system", 
            "content": "You are ContentIQ, a helpful AI assistant that helps with content and travel information."
        }
        messages.insert(0, system_message)
        
        response_chunks = []
        async for chunk in generate_response_with_fallback(messages, stream=False):
            response_chunks.append(chunk)
        
        return response_chunks[-1] if response_chunks else {"error": "No response generated"}
        
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/llm/generate/stream")
async def generate_response_stream(request: GenerateRequest):
    """Generate AI response (streaming)"""
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Add system prompt for ContentIQ
        system_message = {
            "role": "system", 
            "content": "You are ContentIQ, a helpful AI assistant that helps with content and travel information."
        }
        messages.insert(0, system_message)
        
        async def stream_generator():
            async for chunk in generate_response_with_fallback(messages, stream=True):
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
        # Simple analysis - real implementation would use LLM
        is_gap = len(request.available_content) == 0
        return {
            "is_gap": is_gap,
            "priority": "medium" if is_gap else "low",
            "suggested_content_type": "article",
            "suggested_title": f"Guide about {request.query}",
            "reason": "No relevant content found" if is_gap else "Content available"
        }
    except Exception as e:
        logger.error(f"Content gap analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Simplified MCP endpoints (return mock data for now)
@app.get("/api/mcp/content/{content_type}")
async def fetch_content(content_type: str, query: Optional[str] = None):
    """Fetch content from Contentstack CMS (simplified)"""
    # Mock data for testing - real implementation would use MCP
    return [
        {"title": f"Sample {content_type}", "description": f"Mock content for {query or 'general'} query"}
    ]

@app.post("/api/mcp/search")
async def search_content(query: str, content_types: Optional[List[str]] = None):
    """Search content in Contentstack CMS (simplified)"""
    # Mock data for testing
    return [
        {"title": f"Search result for: {query}", "description": "Mock search result", "type": "article"}
    ]

@app.post("/api/mcp/create-draft")
async def create_draft_content(content_type: str, title: str, data: Dict[str, Any]):
    """Create draft content in Contentstack CMS (simplified)"""
    # Mock response - real implementation would use MCP
    return {"id": "mock-draft-123", "title": title, "status": "draft"}

# Simplified Analytics endpoints
@app.post("/api/analytics/track-query")
async def track_query(session_id: str, query: str, response_time_ms: float, success: bool):
    """Track a chat query (simplified)"""
    logger.info(f"Tracking query: {session_id} - {query} - {response_time_ms}ms - {success}")
    return {"status": "success"}

@app.post("/api/analytics/track-content-gap")
async def track_content_gap(query: str, gap_data: Dict[str, Any]):
    """Track a content gap (simplified)"""
    logger.info(f"Tracking content gap: {query}")
    return {"status": "success"}

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Get analytics summary (simplified)"""
    return {
        "total_queries": 42,
        "average_response_time_ms": 650,
        "success_rate": 95.2,
        "content_gaps_count": 5
    }

@app.get("/api/analytics/trends")
async def get_query_trends(days: int = 7):
    """Get query trends (simplified)"""
    return [
        {"date": "2024-09-14", "queries": 15, "avg_response_time": 620},
        {"date": "2024-09-13", "queries": 22, "avg_response_time": 580}
    ]

@app.get("/api/analytics/top-queries")
async def get_top_queries(limit: int = 10):
    """Get top queries (simplified)"""
    return [
        {"query": "What is Contentstack?", "count": 25, "avg_response_time": 540},
        {"query": "How to create content?", "count": 18, "avg_response_time": 670}
    ]

@app.get("/api/analytics/content-gaps")
async def get_content_gaps():
    """Get content gaps (simplified)"""
    return [
        {
            "query": "Advanced deployment strategies",
            "frequency": 8,
            "priority": "high",
            "suggested_content_type": "guide"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_PORT", "8001"))
    logger.info(f"Starting ContentIQ Python services on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)