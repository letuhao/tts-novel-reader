"""
Grammar Agent - Grammar Analysis and Correction
Analyzes user text for grammar errors and provides corrections
"""

import logging
import os
import httpx
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from src.models.state import TutorState

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")


async def grammar_agent(state: TutorState) -> TutorState:
    """
    Grammar agent that analyzes text for grammar errors
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with grammar_analysis
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state")
            return {
                **state,
                "error": "No messages in state",
                "error_agent": "grammar",
            }
        
        last_message = messages[-1]
        user_text = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        logger.info(f"Grammar analysis for text: {user_text[:100]}")
        
        # Prepare grammar analysis prompt
        grammar_prompt = f"""You are an expert English grammar teacher. Analyze the following text for grammar errors and provide corrections.

Text to analyze: "{user_text}"

Respond with a JSON object in this exact format:
{{
    "errors": [
        {{
            "type": "error_type (e.g., tense, subject-verb, article, preposition)",
            "position": start_position,
            "text": "incorrect_text",
            "correction": "corrected_text",
            "explanation": "brief explanation of the error"
        }}
    ],
    "corrected_text": "full corrected text",
    "overall_score": 0-100,
    "feedback": "overall feedback message"
}}

If there are no errors, return an empty errors array and score of 100.
JSON response:"""
        
        # Call Ollama for grammar analysis
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert English grammar teacher. Always respond with valid JSON only."
                        },
                        {
                            "role": "user",
                            "content": grammar_prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Lower temperature for consistent analysis
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            llm_response = result.get("message", {}).get("content", "")
        
        # Parse JSON response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                grammar_analysis = json.loads(json_str)
                
                # Validate structure
                if "errors" not in grammar_analysis:
                    grammar_analysis["errors"] = []
                if "corrected_text" not in grammar_analysis:
                    grammar_analysis["corrected_text"] = user_text
                if "overall_score" not in grammar_analysis:
                    grammar_analysis["overall_score"] = 100
                if "feedback" not in grammar_analysis:
                    grammar_analysis["feedback"] = "No major grammar errors found."
                
                logger.info(f"Grammar analysis complete: {len(grammar_analysis.get('errors', []))} errors found, score: {grammar_analysis.get('overall_score')}")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse grammar analysis JSON: {e}")
                # Fallback response
                grammar_analysis = {
                    "errors": [],
                    "corrected_text": user_text,
                    "overall_score": 100,
                    "feedback": "Unable to analyze grammar. Please try again."
                }
        else:
            logger.warning(f"No JSON found in grammar analysis response")
            grammar_analysis = {
                "errors": [],
                "corrected_text": user_text,
                "overall_score": 100,
                "feedback": "Unable to analyze grammar. Please try again."
            }
        
        # Create tutor response message
        if grammar_analysis.get("errors"):
            error_count = len(grammar_analysis["errors"])
            tutor_response = f"I found {error_count} grammar error(s) in your text.\n\n"
            tutor_response += f"**Overall Score:** {grammar_analysis['overall_score']}/100\n\n"
            tutor_response += f"**Feedback:** {grammar_analysis['feedback']}\n\n"
            
            if error_count > 0:
                tutor_response += "**Errors found:**\n"
                for i, error in enumerate(grammar_analysis["errors"][:5], 1):  # Limit to 5 errors
                    tutor_response += f"{i}. **{error.get('type', 'Error')}:** {error.get('text', '')} → {error.get('correction', '')}\n"
                    tutor_response += f"   Explanation: {error.get('explanation', '')}\n\n"
            
            tutor_response += f"\n**Corrected text:** {grammar_analysis['corrected_text']}"
        else:
            tutor_response = f"Great job! Your text has no grammar errors.\n\n"
            tutor_response += f"**Overall Score:** {grammar_analysis['overall_score']}/100\n\n"
            tutor_response += grammar_analysis.get('feedback', 'Well done!')
        
        # Create chunks for response
        chunks = [{
            "text": tutor_response,
            "emotion": "encouraging" if grammar_analysis.get("overall_score", 0) >= 80 else "supportive",
            "icon": "📝",
            "pause": 0.5,
            "emphasis": False,
        }]
        
        return {
            **state,
            "current_agent": "grammar",  # Update current agent
            "grammar_analysis": grammar_analysis,
            "tutor_response": tutor_response,
            "chunks": chunks,
            "metadata": {
                **state.get("metadata", {}),
                "agent": "grammar",
                "intent": "grammar",
                "errors_found": len(grammar_analysis.get("errors", [])),
                "score": grammar_analysis.get("overall_score", 100),
            },
            "workflow_stage": "formatting",
        }
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling Ollama: {e.response.status_code} - {e.response.text}")
        return {
            **state,
            "error": f"Ollama HTTP error: {e.response.status_code}",
            "error_agent": "grammar",
            "workflow_stage": "error",
        }
    except httpx.TimeoutException:
        logger.error("Timeout calling Ollama for grammar analysis")
        return {
            **state,
            "error": "Ollama timeout",
            "error_agent": "grammar",
            "workflow_stage": "error",
        }
    except Exception as e:
        logger.error(f"Error in grammar agent: {e}", exc_info=True)
        return {
            **state,
            "error": str(e),
            "error_agent": "grammar",
            "workflow_stage": "error",
        }

