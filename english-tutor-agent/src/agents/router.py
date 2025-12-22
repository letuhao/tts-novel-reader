"""
Router Agent - Intent Detection and Routing
Simple keyword-based routing for POC
"""

import logging
from typing import Dict, Any
from src.models.state import TutorState

logger = logging.getLogger(__name__)


def router_agent(state: TutorState) -> TutorState:
    """
    Simple keyword-based router for POC
    
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
        message_content = last_message.content.lower() if hasattr(last_message, 'content') else str(last_message).lower()
        
        logger.info(f"Routing message: {message_content[:100]}")
        
        # Simple keyword-based routing
        grammar_keywords = ["grammar", "grammatical", "error", "wrong", "correct", "mistake"]
        pronunciation_keywords = ["pronunciation", "pronounce", "sound", "speak", "accent"]
        exercise_keywords = ["exercise", "practice", "question", "quiz", "test"]
        vocabulary_keywords = ["vocabulary", "word", "meaning", "definition"]
        translation_keywords = ["translate", "translation", "meaning"]
        
        # Check keywords
        grammar_hit = any(keyword in message_content for keyword in grammar_keywords)
        pronunciation_hit = any(keyword in message_content for keyword in pronunciation_keywords)
        exercise_hit = any(keyword in message_content for keyword in exercise_keywords)
        vocabulary_hit = any(keyword in message_content for keyword in vocabulary_keywords)
        translation_hit = any(keyword in message_content for keyword in translation_keywords)

        # Special-case: user is asking for an *exercise about grammar*.
        # If both "grammar" and "exercise/practice/quiz/test" appear, prefer the Exercise agent.
        if grammar_hit and exercise_hit:
            intent = "exercise"
            confidence = 0.9
        elif grammar_hit:
            intent = "grammar"
            confidence = 0.9
        elif pronunciation_hit:
            intent = "pronunciation"
            confidence = 0.9
        elif exercise_hit:
            intent = "exercise"
            confidence = 0.9
        elif vocabulary_hit:
            intent = "vocabulary"
            confidence = 0.85
        elif translation_hit:
            intent = "translation"
            confidence = 0.85
        else:
            intent = "conversation"
            confidence = 0.7
        
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
        }
        
    except Exception as e:
        logger.error(f"Error in router agent: {e}", exc_info=True)
        # Fallback to conversation
        return {
            **state,
            "intent": "conversation",
            "current_agent": "tutor",
            "routing_confidence": 0.5,
            "error": str(e),
            "error_agent": "router",
            "workflow_stage": "processing",
        }

