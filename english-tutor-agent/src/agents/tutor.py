"""
Tutor Agent - Main Conversation Agent
Calls Ollama service for tutoring conversations
"""

import logging
import os
import httpx
from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from src.models.state import TutorState

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")


async def tutor_agent(state: TutorState) -> TutorState:
    """
    Tutor agent that calls Ollama for conversation
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with tutor_response
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state")
            return {
                **state,
                "error": "No messages in state",
                "error_agent": "tutor",
            }
        
        # Prepare messages for Ollama
        ollama_messages = []
        
        # Add system message
        system_message = {
            "role": "system",
            "content": "You are a friendly and helpful English tutor. Help students learn English through conversation, exercises, and feedback. Be encouraging and clear."
        }
        ollama_messages.append(system_message)
        
        # Convert LangChain messages to Ollama format
        for msg in messages:
            if isinstance(msg, HumanMessage):
                ollama_messages.append({
                    "role": "user",
                    "content": msg.content
                })
            elif isinstance(msg, AIMessage):
                ollama_messages.append({
                    "role": "assistant",
                    "content": msg.content
                })
        
        logger.info(f"Calling Ollama with {len(ollama_messages)} messages")
        
        # Call Ollama API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": ollama_messages,
                    "stream": False,
                },
            )
            response.raise_for_status()
            result = response.json()
            
            tutor_response = result.get("message", {}).get("content", "")
            
            if not tutor_response:
                raise ValueError("Empty response from Ollama")
            
            logger.info(f"Received response from Ollama: {len(tutor_response)} characters")
            
            # Create simple chunk for POC
            chunks = [{
                "text": tutor_response,
                "emotion": "neutral",
                "icon": "📚",
                "pause": 0.5,
                "emphasis": False,
            }]
            
            return {
                **state,
                "tutor_response": tutor_response,
                "chunks": chunks,
                "metadata": {
                    "agent": "tutor",
                    "intent": state.get("intent", "conversation"),
                    "model": OLLAMA_MODEL,
                },
                "workflow_stage": "formatting",
            }
            
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling Ollama: {e.response.status_code} - {e.response.text}")
        return {
            **state,
            "error": f"Ollama HTTP error: {e.response.status_code}",
            "error_agent": "tutor",
            "workflow_stage": "error",
        }
    except httpx.TimeoutException:
        logger.error("Timeout calling Ollama")
        return {
            **state,
            "error": "Ollama timeout",
            "error_agent": "tutor",
            "workflow_stage": "error",
        }
    except Exception as e:
        logger.error(f"Error in tutor agent: {e}", exc_info=True)
        return {
            **state,
            "error": str(e),
            "error_agent": "tutor",
            "workflow_stage": "error",
        }

