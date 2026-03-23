"""
Translation Agent - Bidirectional Translation
Provides context-aware translation between English and Vietnamese with cultural context
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


async def translation_agent(state: TutorState) -> TutorState:
    """
    Translation agent that provides bidirectional translation (EN↔VI) with cultural context
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with translation_data and tutor_response
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state")
            return {
                **state,
                "error": "No messages in state",
                "error_agent": "translation",
            }
        
        last_message = messages[-1]
        user_input = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        logger.info(f"Translation request: {user_input[:100]}")
        
        # Detect translation direction from user input
        # Common patterns: "translate X to Y", "how do you say X in Y", etc.
        direction = _detect_translation_direction(user_input)
        
        # Extract source text (remove translation direction phrases)
        source_text = _extract_source_text(user_input)
        
        # Prepare translation prompt
        translation_prompt = f"""Translate the following text. Provide a natural, accurate translation that preserves meaning and cultural context.

Source text: "{source_text}"

Translation direction: {direction}

Respond with a JSON object in this exact format:
{{
    "source_text": "original text",
    "source_language": "en|vi",
    "target_language": "en|vi",
    "translation": "translated text",
    "alternatives": [
        {{
            "translation": "alternative translation option",
            "context": "when to use this alternative"
        }}
    ],
    "cultural_notes": "cultural context or usage notes (if relevant)",
    "confidence": 0.0-1.0
}}

JSON response:"""
        
        # Call Ollama for translation
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert translator. Provide accurate, natural translations that preserve meaning and cultural context. Always respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": translation_prompt
                    }
                ],
                "stream": False,
                "options": {
                    "temperature": 0.2,  # Lower temperature for more focused, accurate translation
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
                translation_data = json.loads(json_str)
                
                # Validate structure
                if "translation" not in translation_data:
                    translation_data["translation"] = source_text
                if "source_language" not in translation_data:
                    translation_data["source_language"] = direction.split("-")[0]
                if "target_language" not in translation_data:
                    translation_data["target_language"] = direction.split("-")[1]
                if "alternatives" not in translation_data:
                    translation_data["alternatives"] = []
                if "confidence" not in translation_data:
                    translation_data["confidence"] = 0.9
                
                logger.info(f"Translation complete: {translation_data.get('source_language')} → {translation_data.get('target_language')}")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse translation JSON: {e}")
                # Fallback: try to extract translation directly from response
                translation = _extract_translation_from_response(llm_response, source_text)
                translation_data = {
                    "source_text": source_text,
                    "source_language": direction.split("-")[0],
                    "target_language": direction.split("-")[1],
                    "translation": translation,
                    "alternatives": [],
                    "cultural_notes": None,
                    "confidence": 0.8,
                }
        else:
            logger.warning("No JSON found in translation response")
            translation = source_text  # Fallback
            translation_data = {
                "source_text": source_text,
                "source_language": direction.split("-")[0],
                "target_language": direction.split("-")[1],
                "translation": translation,
                "alternatives": [],
                "cultural_notes": None,
                "confidence": 0.7,
            }
        
        # Create tutor response message
        tutor_response = f"**Translation:**\n\n"
        tutor_response += f"**{translation_data.get('source_language', '').upper()}:** {translation_data.get('source_text', source_text)}\n\n"
        tutor_response += f"**{translation_data.get('target_language', '').upper()}:** {translation_data.get('translation', '')}\n\n"
        
        if translation_data.get("alternatives"):
            tutor_response += "**Alternative Translations:**\n"
            for i, alt in enumerate(translation_data["alternatives"][:3], 1):  # Limit to 3 alternatives
                tutor_response += f"{i}. {alt.get('translation', '')}"
                if alt.get('context'):
                    tutor_response += f" ({alt.get('context')})"
                tutor_response += "\n"
            tutor_response += "\n"
        
        if translation_data.get("cultural_notes"):
            tutor_response += f"**Cultural Note:** {translation_data['cultural_notes']}\n\n"
        
        if translation_data.get("confidence"):
            confidence_percent = int(translation_data["confidence"] * 100)
            tutor_response += f"**Confidence:** {confidence_percent}%\n"
        
        # Create chunks for response
        chunks = [{
            "text": tutor_response,
            "emotion": "helpful",
            "icon": "🌐",
            "pause": 0.5,
            "emphasis": False,
        }]
        
        return {
            **state,
            "current_agent": "translation",
            "translation_data": translation_data,
            "tutor_response": tutor_response,
            "chunks": chunks,
            "metadata": {
                **state.get("metadata", {}),
                "agent": "translation",
                "intent": "translation",
                "source_language": translation_data.get("source_language"),
                "target_language": translation_data.get("target_language"),
                "confidence": translation_data.get("confidence", 0.9),
            },
            "workflow_stage": "formatting",
        }
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling Ollama: {e.response.status_code} - {e.response.text}")
        return {
            **state,
            "error": f"Ollama HTTP error: {e.response.status_code}",
            "error_agent": "translation",
            "workflow_stage": "error",
        }
    except httpx.TimeoutException:
        logger.error("Timeout calling Ollama for translation")
        return {
            **state,
            "error": "Ollama timeout",
            "error_agent": "translation",
            "workflow_stage": "error",
        }
    except Exception as e:
        logger.error(f"Error in translation agent: {e}", exc_info=True)
        return {
            **state,
            "error": str(e),
            "error_agent": "translation",
            "workflow_stage": "error",
        }


def _detect_translation_direction(user_input: str) -> str:
    """
    Detect translation direction from user input
    
    Returns:
        "en-vi" or "vi-en"
    """
    user_input_lower = user_input.lower()
    
    # Check for explicit direction indicators
    if any(phrase in user_input_lower for phrase in ["to vietnamese", "to vi", "sang tiếng việt", "sang tiếng việt"]):
        return "en-vi"
    if any(phrase in user_input_lower for phrase in ["to english", "to en", "sang tiếng anh"]):
        return "vi-en"
    
    # Check for Vietnamese text (basic detection)
    # Vietnamese has special characters: ế, ề, ể, ễ, ệ, à, á, ả, ã, ạ, etc.
    vietnamese_chars = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
    has_vietnamese = any(char in user_input for char in vietnamese_chars)
    
    if has_vietnamese:
        # If contains Vietnamese, likely translating to English
        return "vi-en"
    else:
        # Default: English to Vietnamese
        return "en-vi"


def _extract_source_text(user_input: str) -> str:
    """
    Extract source text from user input, removing translation direction phrases
    
    Examples:
        "Translate 'hello' to Vietnamese" -> "hello"
        "How do you say 'thank you' in Vietnamese" -> "thank you"
        "Xin chào" -> "Xin chào"
    """
    # Remove common translation phrases
    patterns_to_remove = [
        r"translate\s+['\"]?",
        r"to\s+(vietnamese|vi|english|en|tiếng việt|tiếng anh)",
        r"how\s+do\s+you\s+say\s+['\"]?",
        r"in\s+(vietnamese|vi|english|en|tiếng việt|tiếng anh)",
        r"sang\s+(tiếng việt|tiếng anh)",
        r"dịch\s+['\"]?",
    ]
    
    text = user_input
    for pattern in patterns_to_remove:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
    
    # Remove leading/trailing quotes and whitespace
    text = text.strip().strip('"').strip("'").strip()
    
    return text if text else user_input  # Fallback to original if empty


def _extract_translation_from_response(response: str, source_text: str) -> str:
    """
    Extract translation from response if JSON parsing failed
    
    This is a fallback method to extract translation from verbose responses
    """
    # Try to find translation in quotes
    quote_match = re.search(r'["\']([^"\']+)["\']', response)
    if quote_match:
        return quote_match.group(1)
    
    # Try to find text after "translation:" or similar labels
    label_patterns = [
        r"translation:\s*(.+)",
        r"vietnamese:\s*(.+)",
        r"english:\s*(.+)",
        r"dịch:\s*(.+)",
    ]
    
    for pattern in label_patterns:
        match = re.search(pattern, response, re.IGNORECASE)
        if match:
            translation = match.group(1).strip()
            # Take first line or first sentence
            translation = translation.split('\n')[0].split('.')[0].strip()
            if translation and len(translation) < 500:  # Reasonable length
                return translation
    
    # Last resort: return source text
    return source_text

