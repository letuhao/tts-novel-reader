"""
Exercise Agent - Exercise Generation
Generates English learning exercises for practice
"""

import logging
import os
import httpx
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage
from src.models.state import TutorState

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")


async def exercise_agent(state: TutorState) -> TutorState:
    """
    Exercise agent that generates English learning exercises
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with exercise_data
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state")
            return {
                **state,
                "error": "No messages in state",
                "error_agent": "exercise",
            }
        
        last_message = messages[-1]
        user_request = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        logger.info(f"Generating exercise for request: {user_request[:100]}")
        
        # Extract topic and type from user request (if specified)
        # Default: general grammar exercise
        topic = "grammar"  # Could extract from user_request
        exercise_type = "multiple-choice"  # Could extract: multiple-choice, fill-in-blank, etc.
        level = "intermediate"  # Could extract: beginner, intermediate, advanced
        
        # Prepare exercise generation prompt
        exercise_prompt = f"""You are an expert English teacher. Generate an English learning exercise based on the user's request.

User request: "{user_request}"

Generate a {exercise_type} exercise on {topic} at {level} level.

Respond with a JSON object in this exact format:
{{
    "type": "multiple-choice",
    "topic": "grammar_topic",
    "level": "beginner|intermediate|advanced",
    "question": "the question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correct_answer": "correct_option_index (0-based)",
    "explanation": "explanation of why the answer is correct",
    "hint": "optional hint for the student"
}}

JSON response:"""
        
        # Call Ollama for exercise generation
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert English teacher. Always respond with valid JSON only."
                        },
                        {
                            "role": "user",
                            "content": exercise_prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.7,  # Higher temperature for creativity
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
                exercise_data = json.loads(json_str)
                
                # Validate structure
                if "question" not in exercise_data:
                    raise ValueError("Missing question field")
                if "options" not in exercise_data:
                    exercise_data["options"] = []
                if "correct_answer" not in exercise_data:
                    exercise_data["correct_answer"] = 0
                if "explanation" not in exercise_data:
                    exercise_data["explanation"] = "The correct answer explains the grammar rule."
                
                logger.info(f"Exercise generated: {exercise_data.get('type')} on {exercise_data.get('topic')}")
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to parse exercise JSON: {e}")
                # Fallback exercise
                exercise_data = _create_fallback_exercise(user_request)
        else:
            logger.warning("No JSON found in exercise generation response")
            exercise_data = _create_fallback_exercise(user_request)
        
        # Format tutor response
        tutor_response = f"Here's a {exercise_data.get('level', 'intermediate')} level exercise on {exercise_data.get('topic', 'grammar')}:\n\n"
        tutor_response += f"**Question:** {exercise_data['question']}\n\n"
        
        if exercise_data.get("options"):
            tutor_response += "**Options:**\n"
            for i, option in enumerate(exercise_data["options"]):
                marker = "✓" if i == exercise_data.get("correct_answer", 0) else " "
                tutor_response += f"{chr(65 + i)}. {option} {marker}\n"
        
        if exercise_data.get("hint"):
            tutor_response += f"\n💡 **Hint:** {exercise_data['hint']}\n"
        
        tutor_response += f"\n**Explanation:** {exercise_data.get('explanation', '')}"
        
        # Create chunks
        chunks = [{
            "text": tutor_response,
            "emotion": "encouraging",
            "icon": "📚",
            "pause": 0.5,
            "emphasis": False,
        }]
        
        return {
            **state,
            "current_agent": "exercise",
            "exercise_data": exercise_data,
            "tutor_response": tutor_response,
            "chunks": chunks,
            "metadata": {
                **state.get("metadata", {}),
                "agent": "exercise",
                "intent": "exercise",
                "exercise_type": exercise_data.get("type", "multiple-choice"),
                "topic": exercise_data.get("topic", "grammar"),
                "level": exercise_data.get("level", "intermediate"),
            },
            "workflow_stage": "formatting",
        }
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling Ollama: {e.response.status_code}")
        return {
            **state,
            "error": f"Ollama HTTP error: {e.response.status_code}",
            "error_agent": "exercise",
            "workflow_stage": "error",
        }
    except httpx.TimeoutException:
        logger.error("Timeout calling Ollama for exercise generation")
        return {
            **state,
            "error": "Ollama timeout",
            "error_agent": "exercise",
            "workflow_stage": "error",
        }
    except Exception as e:
        logger.error(f"Error in exercise agent: {e}", exc_info=True)
        return {
            **state,
            "error": str(e),
            "error_agent": "exercise",
            "workflow_stage": "error",
        }


def _create_fallback_exercise(user_request: str) -> Dict[str, Any]:
    """Create a simple fallback exercise"""
    return {
        "type": "multiple-choice",
        "topic": "grammar",
        "level": "intermediate",
        "question": "Choose the correct form: I ___ to the store yesterday.",
        "options": ["go", "went", "gone", "going"],
        "correct_answer": 1,  # "went"
        "explanation": "We use 'went' (past tense) because the sentence mentions 'yesterday', indicating a past action.",
        "hint": "Think about the time word 'yesterday'."
    }

