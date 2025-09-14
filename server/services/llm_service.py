import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
import openai
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

class LLMService:
    """Multi-provider LLM service with Groq and OpenAI support"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.groq_base_url = "https://api.groq.com/openai/v1"
        
        # Initialize OpenAI client
        if self.openai_api_key:
            self.openai_client = openai.AsyncOpenAI(api_key=self.openai_api_key)
        else:
            self.openai_client = None
            
        # Initialize Groq client (using OpenAI-compatible API)
        if self.groq_api_key:
            self.groq_client = openai.AsyncOpenAI(
                api_key=self.groq_api_key,
                base_url=self.groq_base_url
            )
        else:
            self.groq_client = None
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        content_context: Optional[List[Dict[str, Any]]] = None,
        stream: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate AI response with fallback support"""
        
        # Enhance messages with content context
        enhanced_messages = self._enhance_messages_with_context(messages, content_context or [])
        
        # Try Groq first, fallback to OpenAI
        try:
            if self.groq_client is not None:
                async for chunk in self._generate_with_groq(enhanced_messages, stream):
                    yield chunk
                return
        except Exception as e:
            logger.warning(f"Groq generation failed, falling back to OpenAI: {e}")
        
        # Fallback to OpenAI
        try:
            if self.openai_client is not None:
                async for chunk in self._generate_with_openai(enhanced_messages, stream):
                    yield chunk
                return
        except Exception as e:
            logger.error(f"OpenAI generation also failed: {e}")
        
        # Both providers failed
        yield {
            "chunk": "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
            "done": True,
            "error": True
        }
    
    async def _generate_with_groq(
        self, 
        messages: List[Dict[str, str]], 
        stream: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate response using Groq"""
        start_time = datetime.now()
        
        try:
            response = await self.groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
                stream=stream
            )
            
            if stream:
                full_response = ""
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield {
                            "chunk": content,
                            "done": False,
                            "provider": "groq"
                        }
                
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                yield {
                    "chunk": "",
                    "done": True,
                    "response_time_ms": response_time,
                    "provider": "groq"
                }
            else:
                content = response.choices[0].message.content
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                yield {
                    "chunk": content,
                    "done": True,
                    "response_time_ms": response_time,
                    "provider": "groq"
                }
                
        except Exception as e:
            logger.error(f"Groq generation error: {e}")
            raise
    
    async def _generate_with_openai(
        self, 
        messages: List[Dict[str, str]], 
        stream: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate response using OpenAI"""
        start_time = datetime.now()
        
        try:
            # the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
            response = await self.openai_client.chat.completions.create(
                model="gpt-5",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
                stream=stream
            )
            
            if stream:
                full_response = ""
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield {
                            "chunk": content,
                            "done": False,
                            "provider": "openai"
                        }
                
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                yield {
                    "chunk": "",
                    "done": True,
                    "response_time_ms": response_time,
                    "provider": "openai"
                }
            else:
                content = response.choices[0].message.content
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                yield {
                    "chunk": content,
                    "done": True,
                    "response_time_ms": response_time,
                    "provider": "openai"
                }
                
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise
    
    def _enhance_messages_with_context(
        self, 
        messages: List[Dict[str, str]], 
        content_context: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, str]]:
        """Enhance messages with content context from CMS"""
        
        system_prompt = """You are ContentIQ, an AI assistant powered by Contentstack MCP integration. 
        You help users find information about travel content, tours, hotels, and travel guides.
        
        When content is found in the CMS, reference it naturally in your responses.
        If no relevant content is found, acknowledge this and suggest what content might be helpful.
        
        Always be helpful, accurate, and engaging in your responses."""
        
        if content_context:
            context_text = "\n\nAvailable content from CMS:\n"
            for item in content_context:
                context_text += f"- {item.get('title', 'Untitled')}: {item.get('description', 'No description')}\n"
            
            system_prompt += context_text
        
        enhanced_messages = [{"role": "system", "content": system_prompt}]
        enhanced_messages.extend(messages)
        
        return enhanced_messages
    
    async def analyze_content_gap(self, query: str, available_content: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze if query represents a content gap"""
        
        try:
            messages = [
                {
                    "role": "system",
                    "content": """Analyze if the user query represents a content gap based on available content.
                    Respond with JSON in this format:
                    {
                        "is_gap": boolean,
                        "priority": "high|medium|low",
                        "suggested_content_type": "string",
                        "suggested_title": "string",
                        "reason": "string"
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Query: {query}\nAvailable content: {json.dumps(available_content)}"
                }
            ]
            
            if self.openai_client is not None:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-5", # the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.3
                )
                
                return json.loads(response.choices[0].message.content)
            
            # Fallback analysis if no OpenAI
            return {
                "is_gap": len(available_content) == 0,
                "priority": "medium",
                "suggested_content_type": "article",
                "suggested_title": f"Guide about {query}",
                "reason": "No relevant content found for this query"
            }
            
        except Exception as e:
            logger.error(f"Content gap analysis failed: {e}")
            return {
                "is_gap": False,
                "priority": "low",
                "suggested_content_type": "article",
                "suggested_title": "",
                "reason": "Analysis failed"
            }

# Global LLM service instance
llm_service = LLMService()
