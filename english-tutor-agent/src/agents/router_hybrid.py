"""
Hybrid Router Agent
Combines fast keyword-based routing with LLM-based routing for ambiguous cases
"""

import logging
from typing import Dict, Any
from src.models.state import TutorState
from src.agents.router import router_agent
from src.agents.router_llm import router_agent_llm

logger = logging.getLogger(__name__)

def _is_ambiguous_multi_intent(message: str) -> tuple[bool, dict[str, bool]]:
    """
    Heuristic ambiguity detector.
    If multiple intent keyword groups match, treat as ambiguous and force LLM routing.
    """
    text = (message or "").lower()
    grammar_keywords = ["grammar", "grammatical", "error", "wrong", "correct", "mistake"]
    pronunciation_keywords = ["pronunciation", "pronounce", "sound", "speak", "accent"]
    exercise_keywords = ["exercise", "practice", "question", "quiz", "test"]
    vocabulary_keywords = ["vocabulary", "word", "meaning", "definition"]
    translation_keywords = ["translate", "translation"]

    hits = {
        "grammar": any(k in text for k in grammar_keywords),
        "pronunciation": any(k in text for k in pronunciation_keywords),
        "exercise": any(k in text for k in exercise_keywords),
        "vocabulary": any(k in text for k in vocabulary_keywords),
        "translation": any(k in text for k in translation_keywords),
    }
    hit_count = sum(1 for v in hits.values() if v)
    return hit_count >= 2, hits


async def router_agent_hybrid(state: TutorState) -> TutorState:
    """
    Hybrid router: Fast keyword routing first, LLM for ambiguous cases
    
    Strategy:
    1. Try keyword-based routing (fast)
    2. If confidence is low (< 0.8), use LLM routing
    3. Return best result
    
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
        
        logger.info(f"Hybrid routing message: {message_content[:100]}")

        # Step 0: Detect ambiguous multi-intent cases and force LLM routing
        ambiguous, hits = _is_ambiguous_multi_intent(message_content)
        if ambiguous:
            logger.info(f"Ambiguous multi-intent detected: {hits}. Forcing LLM routing.")
            try:
                llm_result = await router_agent_llm(state)
                return {
                    **llm_result,
                    "metadata": {
                        **llm_result.get("metadata", {}),
                        "routing_method": "hybrid_llm_ambiguous",
                        "keyword_hits": hits,
                    },
                }
            except Exception as e:
                logger.warning(f"LLM routing failed for ambiguous case: {e}, falling back to keyword routing")
                keyword_result = router_agent(state)
                return {
                    **keyword_result,
                    "metadata": {
                        **keyword_result.get("metadata", {}),
                        "routing_method": "hybrid_keyword_ambiguous_fallback",
                        "keyword_hits": hits,
                    },
                }
        
        # Step 1: Try keyword-based routing (fast)
        keyword_result = router_agent(state)
        keyword_confidence = keyword_result.get("routing_confidence", 0.5)
        
        logger.info(f"Keyword routing: intent={keyword_result.get('intent')}, confidence={keyword_confidence}")
        
        # Step 2: If confidence is low, use LLM routing
        if keyword_confidence < 0.8:
            logger.info("Low keyword confidence, using LLM routing")
            try:
                llm_result = await router_agent_llm(state)
                llm_confidence = llm_result.get("routing_confidence", 0.5)
                
                logger.info(f"LLM routing: intent={llm_result.get('intent')}, confidence={llm_confidence}")
                
                # Use LLM result if it has higher confidence
                if llm_confidence > keyword_confidence:
                    logger.info(f"Using LLM result (confidence {llm_confidence} > {keyword_confidence})")
                    return {
                        **llm_result,
                        "metadata": {
                            **llm_result.get("metadata", {}),
                            "routing_method": "hybrid_llm",
                        }
                    }
                else:
                    logger.info(f"Using keyword result (confidence {keyword_confidence} >= {llm_confidence})")
                    return {
                        **keyword_result,
                        "metadata": {
                            **keyword_result.get("metadata", {}),
                            "routing_method": "hybrid_keyword",
                        }
                    }
            except Exception as e:
                logger.warning(f"LLM routing failed: {e}, using keyword result")
                return {
                    **keyword_result,
                    "metadata": {
                        **keyword_result.get("metadata", {}),
                        "routing_method": "hybrid_keyword_fallback",
                    }
                }
        else:
            # High confidence keyword result, use it
            logger.info(f"High keyword confidence ({keyword_confidence}), using keyword result")
            return {
                **keyword_result,
                "metadata": {
                    **keyword_result.get("metadata", {}),
                    "routing_method": "hybrid_keyword",
                }
            }
            
    except Exception as e:
        logger.error(f"Error in hybrid router agent: {e}", exc_info=True)
        # Fallback to keyword routing
        return router_agent(state)

