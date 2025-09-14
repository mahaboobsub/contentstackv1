import os
from typing import Dict, Any

class Config:
    """Application configuration"""
    
    # MCP Configuration
    MCP_COMMAND = "npx"
    MCP_ARGS = ["-y", "@contentstack/mcp"]
    
    # Contentstack Configuration
    CONTENTSTACK_API_KEY = os.getenv("CONTENTSTACK_API_KEY")
    CONTENTSTACK_DELIVERY_TOKEN = os.getenv("CONTENTSTACK_DELIVERY_TOKEN")
    CONTENTSTACK_MANAGEMENT_TOKEN = os.getenv("CONTENTSTACK_MANAGEMENT_TOKEN")
    CONTENTSTACK_ENVIRONMENT = os.getenv("CONTENTSTACK_ENVIRONMENT", "development")
    CONTENTSTACK_LAUNCH_PROJECT_ID = os.getenv("CONTENTSTACK_LAUNCH_PROJECT_ID")
    
    # LLM Configuration
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Application Configuration
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # CORS Configuration
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    
    @classmethod
    def validate(cls) -> Dict[str, Any]:
        """Validate configuration and return status"""
        
        issues = []
        warnings = []
        
        # Check required Contentstack config
        if not cls.CONTENTSTACK_API_KEY:
            issues.append("CONTENTSTACK_API_KEY is required")
        
        if not cls.CONTENTSTACK_DELIVERY_TOKEN:
            issues.append("CONTENTSTACK_DELIVERY_TOKEN is required")
        
        # Check LLM config (at least one required)
        if not cls.GROQ_API_KEY and not cls.OPENAI_API_KEY:
            issues.append("Either GROQ_API_KEY or OPENAI_API_KEY is required")
        
        # Warnings for optional config
        if not cls.CONTENTSTACK_MANAGEMENT_TOKEN:
            warnings.append("CONTENTSTACK_MANAGEMENT_TOKEN not set - draft creation disabled")
        
        if not cls.CONTENTSTACK_LAUNCH_PROJECT_ID:
            warnings.append("CONTENTSTACK_LAUNCH_PROJECT_ID not set - deployment features disabled")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings
        }

config = Config()
