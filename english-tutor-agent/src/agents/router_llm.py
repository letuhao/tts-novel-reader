"""
LLM-based Router Agent
Enhanced intent detection using Ollama LLM
"""

import logging
import os
import httpx
from typing import Dict, Any, Optional
from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.config import get_settings

logger = logging.getLogger(__name__)

# -----------------------------
# Robust JSON extraction/parsing
# -----------------------------
def _extract_json_object(text: str) -> Optional[str]:
    """
    Extract the first JSON object from a string using brace balancing.
    Handles responses that include markdown fences or leading/trailing text.
    """
    if not text:
        return None

    # Prefer fenced ```json ... ``` blocks if present
    fence_start = text.find("```")
    if fence_start != -1:
        # Try to find a json fence
        lowered = text.lower()
        json_fence = lowered.find("```json")
        if json_fence != -1:
            start = lowered.find("{", json_fence)
            if start != -1:
                # fall through to brace scan from that start
                pass

    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue

        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return None


def _parse_router_json(json_str: str) -> Optional[dict]:
    """Parse router JSON with a small amount of tolerance (e.g., trailing commas)."""
    if not json_str:
        return None
    import json
    import re

    s = json_str.strip()

    # Remove trailing commas before } or ]
    s = re.sub(r",\s*([}\]])", r"\1", s)

    # Some models may omit outer braces; attempt to wrap if it looks like key/value pairs
    if not s.startswith("{") and '"intent"' in s:
        s = "{\n" + s + "\n}"

    try:
        return json.loads(s)
    except Exception:
        return None


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

Respond with ONLY a JSON object in this exact format (no markdown, no extra text, no trailing commas):
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
        settings = get_settings()
        # Allow env override for router model if desired, otherwise use Settings default
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", settings.ollama_base_url)
        router_model = os.getenv("ROUTER_LLM_MODEL", settings.router_llm_model or settings.ollama_model)

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
                f"{ollama_base_url}/api/chat",
                json={
                    "model": router_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    # Ask Ollama to enforce JSON output when supported
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.0,  # Deterministic for classification
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            llm_response = result.get("message", {}).get("content", "")
        
        # Parse JSON response (robust)
        json_str = _extract_json_object(llm_response) or llm_response
        classification = _parse_router_json(json_str)
        if not classification:
            logger.warning(
                f"Failed to parse router JSON. model={router_model}. "
                f"response_preview={llm_response[:200]!r}. Falling back to keyword routing"
            )
            return await _fallback_keyword_routing(state, message_content)

        intent = classification.get("intent", "conversation")
        confidence = float(classification.get("confidence", 0.7))
        reasoning = classification.get("reasoning", "")
        logger.info(f"LLM classification: intent={intent}, confidence={confidence}, reasoning={reasoning}")
        
        # Map intent to agent
        agent_map = {
            "conversation": "tutor",
            "grammar": "grammar",
            "pronunciation": "tutor",  # Will be pronunciation agent later
            "exercise": "exercise",  # Route to exercise agent
            "vocabulary": "vocabulary",
            "translation": "translation",
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
                "router_model": router_model,
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

