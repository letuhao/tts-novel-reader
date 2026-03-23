"""
Main FastAPI Application
API endpoints for LangGraph agent service
"""

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from langchain_core.messages import HumanMessage

from src.config import get_settings
from src.services.logger import setup_logging
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow

# Setup logging
settings = get_settings()
setup_logging(level=settings.log_level)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="English Tutor Agent API",
    description="LangGraph Multi-Agent System for English Tutoring",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build workflow
# Note: For production, PostgresSaver context manager will be handled by LangGraph at compile/runtime
# If PostgresSaver doesn't support async, it will fall back to MemorySaver automatically
workflow_app = build_workflow(require_async_checkpointer=True)
logger.info("Workflow initialized")


# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str
    options: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None


# Health Check
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "english-tutor-agent",
        "version": "0.1.0",
        "checkpointer": type(workflow_app.checkpointer).__name__
    }


# Chat Endpoint
@app.post("/api/agents/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint - Main entry point for agent conversations
    """
    try:
        logger.info(f"Chat request: conversation_id={request.conversation_id}, user_id={request.user_id}")
        
        # Create initial state
        initial_state: TutorState = {
            "messages": [HumanMessage(content=request.message)],
            "conversation_id": request.conversation_id,
            "user_id": request.user_id,
            "workflow_stage": "routing",
        }
        
        # Invoke workflow
        config = {"configurable": {"thread_id": request.conversation_id}}
        
        # Run workflow (use ainvoke for async nodes like router_agent_hybrid)
        result = await workflow_app.ainvoke(initial_state, config=config)
        
        # Check for errors
        if result.get("error"):
            logger.error(f"Workflow error: {result.get('error')}")
            return ChatResponse(
                success=False,
                data={},
                error=result.get("error")
            )
        
        # Prepare response
        response_data = {
            "conversation_id": request.conversation_id,
            "chunks": result.get("chunks", []),
            "metadata": result.get("metadata", {}),
            "intent": result.get("intent"),
            "agent": result.get("current_agent"),
        }
        
        logger.info(f"Chat response: intent={result.get('intent')}, chunks={len(result.get('chunks', []))}")
        
        return ChatResponse(
            success=True,
            data=response_data,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "English Tutor Agent API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    host = settings.api_host
    port = settings.api_port
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
