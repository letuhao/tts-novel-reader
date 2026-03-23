"""
Pronunciation Agent - Pronunciation Practice and Feedback
Handles pronunciation practice requests and provides feedback
"""

import logging
import os
import httpx
import json
import re
from typing import Dict, Any, Optional
from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.config import get_settings

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")


async def pronunciation_agent(state: TutorState) -> TutorState:
    """
    Pronunciation agent that provides pronunciation practice and feedback
    
    This agent handles two scenarios:
    1. Text-based pronunciation practice: User provides text, agent creates practice plan
    2. Audio-based feedback: User provides audio, agent transcribes and analyzes pronunciation
       (Future enhancement - currently focuses on text-based practice)
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with pronunciation_feedback and tutor_response
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state")
            return {
                **state,
                "error": "No messages in state",
                "error_agent": "pronunciation",
            }
        
        last_message = messages[-1]
        user_input = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        logger.info(f"Pronunciation practice for: {user_input[:100]}")
        
        # Check if user wants to practice specific words/phrases
        # Extract target text from user input
        # For now, assume the user message contains the text they want to practice
        
        # Prepare pronunciation practice prompt
        pronunciation_prompt = f"""You are an expert English pronunciation teacher. The user wants to practice pronunciation.

User request: "{user_input}"

Create a comprehensive pronunciation practice plan for the text/phrase they want to practice. Focus on:
1. Phonetic transcription (IPA)
2. Key pronunciation points
3. Common mistakes to avoid
4. Practice tips
5. Similar sounds/examples

If the user message contains specific words or phrases to practice, focus on those. Otherwise, provide general pronunciation guidance.

Respond with a JSON object in this exact format:
{{
    "target_text": "the text/words to practice",
    "phonetic_transcription": "IPA phonetic transcription",
    "key_points": [
        {{
            "sound": "specific sound/letter",
            "pronunciation": "how to pronounce it",
            "tip": "helpful tip"
        }}
    ],
    "common_mistakes": [
        {{
            "mistake": "common mistake description",
            "correct": "correct pronunciation",
            "explanation": "why this mistake happens"
        }}
    ],
    "practice_tips": [
        "tip 1",
        "tip 2",
        "tip 3"
    ],
    "similar_examples": [
        {{
            "word": "similar word",
            "pronunciation": "pronunciation guide"
        }}
    ],
    "difficulty_level": "beginner|intermediate|advanced",
    "overall_score": "score if analyzing pronunciation (0-100), null if just practice plan"
}}

JSON response:"""
        
        # Call Ollama for pronunciation analysis/practice plan
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert English pronunciation teacher. Always respond with valid JSON only."
                        },
                        {
                            "role": "user",
                            "content": pronunciation_prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.5,  # Balanced for creative but structured output
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            llm_response = result.get("message", {}).get("content", "")
        
        # Parse JSON response
        json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                pronunciation_data = json.loads(json_str)
                
                # Validate structure
                if "target_text" not in pronunciation_data:
                    pronunciation_data["target_text"] = user_input
                if "key_points" not in pronunciation_data:
                    pronunciation_data["key_points"] = []
                if "common_mistakes" not in pronunciation_data:
                    pronunciation_data["common_mistakes"] = []
                if "practice_tips" not in pronunciation_data:
                    pronunciation_data["practice_tips"] = []
                if "similar_examples" not in pronunciation_data:
                    pronunciation_data["similar_examples"] = []
                if "difficulty_level" not in pronunciation_data:
                    pronunciation_data["difficulty_level"] = "intermediate"
                
                logger.info(f"Pronunciation analysis complete: target_text='{pronunciation_data.get('target_text', '')[:50]}'")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse pronunciation JSON: {e}")
                # Fallback response
                pronunciation_data = _create_fallback_pronunciation(user_input)
        else:
            logger.warning("No JSON found in pronunciation response")
            pronunciation_data = _create_fallback_pronunciation(user_input)
        
        # Create tutor response message
        tutor_response = f"Here's your pronunciation practice plan for: **{pronunciation_data.get('target_text', user_input)}**\n\n"
        
        if pronunciation_data.get("phonetic_transcription"):
            tutor_response += f"**Phonetic Transcription (IPA):** /{pronunciation_data['phonetic_transcription']}/\n\n"
        
        if pronunciation_data.get("key_points"):
            tutor_response += "**Key Pronunciation Points:**\n"
            for i, point in enumerate(pronunciation_data["key_points"][:5], 1):  # Limit to 5 points
                tutor_response += f"{i}. **{point.get('sound', 'Sound')}**: {point.get('pronunciation', '')}\n"
                if point.get('tip'):
                    tutor_response += f"   💡 Tip: {point.get('tip')}\n"
            tutor_response += "\n"
        
        if pronunciation_data.get("common_mistakes"):
            tutor_response += "**Common Mistakes to Avoid:**\n"
            for i, mistake in enumerate(pronunciation_data["common_mistakes"][:3], 1):  # Limit to 3 mistakes
                tutor_response += f"{i}. ❌ {mistake.get('mistake', '')} → ✅ {mistake.get('correct', '')}\n"
                if mistake.get('explanation'):
                    tutor_response += f"   {mistake.get('explanation')}\n"
            tutor_response += "\n"
        
        if pronunciation_data.get("practice_tips"):
            tutor_response += "**Practice Tips:**\n"
            for i, tip in enumerate(pronunciation_data["practice_tips"][:5], 1):  # Limit to 5 tips
                tutor_response += f"• {tip}\n"
            tutor_response += "\n"
        
        if pronunciation_data.get("similar_examples"):
            tutor_response += "**Similar Examples:**\n"
            for example in pronunciation_data["similar_examples"][:3]:  # Limit to 3 examples
                tutor_response += f"• **{example.get('word', '')}**: {example.get('pronunciation', '')}\n"
            tutor_response += "\n"
        
        if pronunciation_data.get("overall_score") is not None:
            score = pronunciation_data["overall_score"]
            tutor_response += f"**Pronunciation Score:** {score}/100\n\n"
        
        tutor_response += "Keep practicing! 🎤✨"
        
        # Create chunks for response
        chunks = [{
            "text": tutor_response,
            "emotion": "encouraging",
            "icon": "🎤",
            "pause": 0.5,
            "emphasis": False,
        }]
        
        return {
            **state,
            "current_agent": "pronunciation",
            "pronunciation_feedback": pronunciation_data,
            "tutor_response": tutor_response,
            "chunks": chunks,
            "metadata": {
                **state.get("metadata", {}),
                "agent": "pronunciation",
                "intent": "pronunciation",
                "difficulty_level": pronunciation_data.get("difficulty_level", "intermediate"),
                "target_text": pronunciation_data.get("target_text", user_input),
            },
            "workflow_stage": "formatting",
        }
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling Ollama: {e.response.status_code} - {e.response.text}")
        return {
            **state,
            "error": f"Ollama HTTP error: {e.response.status_code}",
            "error_agent": "pronunciation",
            "workflow_stage": "error",
        }
    except httpx.TimeoutException:
        logger.error("Timeout calling Ollama for pronunciation analysis")
        return {
            **state,
            "error": "Ollama timeout",
            "error_agent": "pronunciation",
            "workflow_stage": "error",
        }
    except Exception as e:
        logger.error(f"Error in pronunciation agent: {e}", exc_info=True)
        return {
            **state,
            "error": str(e),
            "error_agent": "pronunciation",
            "workflow_stage": "error",
        }


def _create_fallback_pronunciation(user_input: str) -> Dict[str, Any]:
    """Create a simple fallback pronunciation practice plan"""
    return {
        "target_text": user_input,
        "phonetic_transcription": "",
        "key_points": [
            {
                "sound": "General pronunciation",
                "pronunciation": "Focus on clear articulation",
                "tip": "Practice speaking slowly and clearly"
            }
        ],
        "common_mistakes": [],
        "practice_tips": [
            "Listen to native speakers",
            "Practice daily",
            "Record yourself and compare",
            "Focus on one sound at a time"
        ],
        "similar_examples": [],
        "difficulty_level": "intermediate",
        "overall_score": None,
    }

