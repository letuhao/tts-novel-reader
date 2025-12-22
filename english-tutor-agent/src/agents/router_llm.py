"""
LLM-based Router Agent
Enhanced intent detection using Ollama LLM
"""

import logging
import os
import httpx
from typing import Dict, Any
from langchain_core.messages import HumanMessage
from src.models.state import TutorState

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")

# Intent classification prompt template
def get_intent_classification_prompt(message: str) -> str:
    """Get intent classification prompt with message"""
    return f"""You are an intent classifier for an English tutoring system. Analyze the user's message and determine their intent.

Available intents:
- "conversation": General conversation, questions about English, learning advice
- "grammar": Grammar checking, error correction, grammar questions
- "pronunciation": Pronunciation practice, how to pronounce words
- "exercise": Request for exercises, practice questions, quizzes
- "vocabulary": Word meanings, definitions, vocabulary questions
- "translation": Translation requests between English and other languages

Respond with ONLY a JSON object in this exact format:
{{
    "intent": "one of the intents above",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}

User message: "{message}"

JSON response:"""


async def router_agent_llm(state: TutorState) -> TutorState:
    """
    LLM-based router agent for intent detection
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with intent and current_agent
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state, defaulting to conversation")
            return {
                **state,
                "intent": "conversation",
                "current_agent": "tutor",
                "routing_confidence": 0.5,
                "workflow_stage": "processing",
            }
        
        last_message = messages[-1]
        message_content = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        logger.info(f"LLM routing message: {message_content[:100]}")
        
        # Prepare prompt
        prompt = get_intent_classification_prompt(message_content)
        
        # Call Ollama for intent classification
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Lower temperature for classification
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            llm_response = result.get("message", {}).get("content", "")
        
        # Parse JSON response
        import json
        import re
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\{[^{}]*"intent"[^{}]*\}', llm_response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                classification = json.loads(json_str)
                intent = classification.get("intent", "conversation")
                confidence = float(classification.get("confidence", 0.7))
                reasoning = classification.get("reasoning", "")
                
                logger.info(f"LLM classification: intent={intent}, confidence={confidence}, reasoning={reasoning}")
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse LLM JSON response: {json_str}, falling back to keyword routing")
                return await _fallback_keyword_routing(state, message_content)
        else:
            logger.warning(f"No JSON found in LLM response: {llm_response[:200]}, falling back to keyword routing")
            return await _fallback_keyword_routing(state, message_content)
        
        # Map intent to agent
        agent_map = {
            "conversation": "tutor",
            "grammar": "grammar",
            "pronunciation": "tutor",  # Will be pronunciation agent later
            "exercise": "exercise",  # Route to exercise agent
            "vocabulary": "tutor",
            "translation": "tutor",
            "unknown": "tutor",
        }
        
        current_agent = agent_map.get(intent, "tutor")
        
        logger.info(f"Routed to: intent={intent}, agent={current_agent}, confidence={confidence}")
        
        return {
            **state,
            "intent": intent,
            "current_agent": current_agent,
            "previous_agent": state.get("current_agent"),
            "routing_confidence": confidence,
            "workflow_stage": "processing",
            "metadata": {
                **state.get("metadata", {}),
                "routing_method": "llm",
                "routing_reasoning": reasoning,
            }
        }
        
    except httpx.TimeoutException:
        logger.warning("LLM routing timeout, falling back to keyword routing")
        return await _fallback_keyword_routing(state, message_content if 'message_content' in locals() else str(messages[-1]))
    except Exception as e:
        logger.error(f"Error in LLM router agent: {e}", exc_info=True)
        # Fallback to keyword routing
        return await _fallback_keyword_routing(state, message_content if 'message_content' in locals() else str(messages[-1]))


async def _fallback_keyword_routing(state: TutorState, message_content: str) -> TutorState:
    """
    Fallback keyword-based routing
    
    Args:
        state: Current workflow state
        message_content: Message content to analyze
        
    Returns:
        Updated state with intent from keyword routing
    """
    from langchain_core.messages import HumanMessage
    from src.agents.router import router_agent
    
    # Create a temporary state with proper message format
    from copy import deepcopy
    temp_state = deepcopy(state)
    temp_state["messages"] = [HumanMessage(content=message_content)]
    
    # Call sync router (it doesn't use async operations)
    result = router_agent(temp_state)
    
    # Update metadata to indicate fallback
    result["metadata"] = {
        **result.get("metadata", {}),
        "routing_method": "keyword_fallback",
    }
    
    return result

