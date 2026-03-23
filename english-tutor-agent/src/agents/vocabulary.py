"""
Vocabulary Agent - Vocabulary Learning and Word Analysis
Provides word definitions, synonyms, antonyms, usage examples, and vocabulary quizzes
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


async def vocabulary_agent(state: TutorState) -> TutorState:
    """
    Vocabulary agent that provides word definitions, synonyms, examples, and vocabulary learning
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with vocabulary_data and tutor_response
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state")
            return {
                **state,
                "error": "No messages in state",
                "error_agent": "vocabulary",
            }
        
        last_message = messages[-1]
        user_input = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        logger.info(f"Vocabulary request: {user_input[:100]}")
        
        # Extract target word/phrase from user input
        # Check if user wants a quiz
        is_quiz_request = any(keyword in user_input.lower() for keyword in ["quiz", "test", "practice", "exercise"])
        
        if is_quiz_request:
            # Generate vocabulary quiz
            result = await _generate_vocabulary_quiz(state, user_input)
        else:
            # Provide word information
            result = await _provide_word_info(state, user_input)
        
        return result
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling Ollama: {e.response.status_code} - {e.response.text}")
        return {
            **state,
            "error": f"Ollama HTTP error: {e.response.status_code}",
            "error_agent": "vocabulary",
            "workflow_stage": "error",
        }
    except httpx.TimeoutException:
        logger.error("Timeout calling Ollama for vocabulary analysis")
        return {
            **state,
            "error": "Ollama timeout",
            "error_agent": "vocabulary",
            "workflow_stage": "error",
        }
    except Exception as e:
        logger.error(f"Error in vocabulary agent: {e}", exc_info=True)
        return {
            **state,
            "error": str(e),
            "error_agent": "vocabulary",
            "workflow_stage": "error",
        }


async def _provide_word_info(state: TutorState, user_input: str) -> TutorState:
    """Provide word definition, synonyms, examples, etc."""
    
    # Prepare vocabulary analysis prompt
    vocabulary_prompt = f"""You are an expert English vocabulary teacher. Analyze the word or phrase requested by the user and provide comprehensive vocabulary information.

User request: "{user_input}"

Extract the target word/phrase and provide detailed vocabulary information. Respond with a JSON object in this exact format:
{{
    "target_word": "the word/phrase being analyzed",
    "part_of_speech": "noun|verb|adjective|adverb|etc.",
    "definitions": [
        {{
            "meaning": "primary definition",
            "context": "example usage context"
        }}
    ],
    "pronunciation": "phonetic pronunciation (IPA if possible)",
    "synonyms": ["synonym1", "synonym2", "synonym3"],
    "antonyms": ["antonym1", "antonym2"],
    "examples": [
        {{
            "sentence": "example sentence using the word",
            "context": "brief context explanation"
        }}
    ],
    "difficulty_level": "beginner|intermediate|advanced",
    "common_usage": "brief note on how commonly this word is used",
    "related_words": ["related word 1", "related word 2"],
    "etymology": "brief etymology if interesting/relevant (optional)"
}}

If the user asks for multiple words or a comparison (e.g., "difference between X and Y"), adapt the format accordingly.

JSON response:"""
    
    # Call Ollama for vocabulary analysis
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert English vocabulary teacher. Always respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": vocabulary_prompt
                    }
                ],
                "stream": False,
                "options": {
                    "temperature": 0.4,  # Balanced for creative but structured output
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
            vocabulary_data = json.loads(json_str)
            
            # Validate structure
            if "target_word" not in vocabulary_data:
                vocabulary_data["target_word"] = user_input
            if "definitions" not in vocabulary_data:
                vocabulary_data["definitions"] = []
            if "synonyms" not in vocabulary_data:
                vocabulary_data["synonyms"] = []
            if "antonyms" not in vocabulary_data:
                vocabulary_data["antonyms"] = []
            if "examples" not in vocabulary_data:
                vocabulary_data["examples"] = []
            if "difficulty_level" not in vocabulary_data:
                vocabulary_data["difficulty_level"] = "intermediate"
            
            logger.info(f"Vocabulary analysis complete: target_word='{vocabulary_data.get('target_word', '')}'")
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse vocabulary JSON: {e}")
            vocabulary_data = _create_fallback_vocabulary(user_input)
    else:
        logger.warning("No JSON found in vocabulary response")
        vocabulary_data = _create_fallback_vocabulary(user_input)
    
    # Create tutor response message
    tutor_response = f"**Word: {vocabulary_data.get('target_word', user_input)}**\n\n"
    
    if vocabulary_data.get("part_of_speech"):
        tutor_response += f"**Part of Speech:** {vocabulary_data['part_of_speech']}\n\n"
    
    if vocabulary_data.get("pronunciation"):
        tutor_response += f"**Pronunciation:** /{vocabulary_data['pronunciation']}/\n\n"
    
    if vocabulary_data.get("definitions"):
        tutor_response += "**Definitions:**\n"
        for i, definition in enumerate(vocabulary_data["definitions"][:3], 1):  # Limit to 3 definitions
            tutor_response += f"{i}. {definition.get('meaning', '')}"
            if definition.get('context'):
                tutor_response += f" ({definition.get('context')})"
            tutor_response += "\n"
        tutor_response += "\n"
    
    if vocabulary_data.get("synonyms"):
        tutor_response += f"**Synonyms:** {', '.join(vocabulary_data['synonyms'][:5])}\n\n"
    
    if vocabulary_data.get("antonyms"):
        tutor_response += f"**Antonyms:** {', '.join(vocabulary_data['antonyms'][:5])}\n\n"
    
    if vocabulary_data.get("examples"):
        tutor_response += "**Usage Examples:**\n"
        for i, example in enumerate(vocabulary_data["examples"][:3], 1):  # Limit to 3 examples
            tutor_response += f"{i}. \"{example.get('sentence', '')}\"\n"
            if example.get('context'):
                tutor_response += f"   ({example.get('context')})\n"
        tutor_response += "\n"
    
    if vocabulary_data.get("related_words"):
        tutor_response += f"**Related Words:** {', '.join(vocabulary_data['related_words'][:5])}\n\n"
    
    if vocabulary_data.get("common_usage"):
        tutor_response += f"**Common Usage:** {vocabulary_data['common_usage']}\n\n"
    
    if vocabulary_data.get("etymology"):
        tutor_response += f"**Etymology:** {vocabulary_data['etymology']}\n\n"
    
    tutor_response += f"**Difficulty Level:** {vocabulary_data.get('difficulty_level', 'intermediate').upper()}\n"
    
    # Create chunks for response
    chunks = [{
        "text": tutor_response,
        "emotion": "educational",
        "icon": "📚",
        "pause": 0.5,
        "emphasis": False,
    }]
    
    return {
        **state,
        "current_agent": "vocabulary",
        "vocabulary_data": vocabulary_data,
        "tutor_response": tutor_response,
        "chunks": chunks,
        "metadata": {
            **state.get("metadata", {}),
            "agent": "vocabulary",
            "intent": "vocabulary",
            "target_word": vocabulary_data.get("target_word", user_input),
            "difficulty_level": vocabulary_data.get("difficulty_level", "intermediate"),
        },
        "workflow_stage": "formatting",
    }


async def _generate_vocabulary_quiz(state: TutorState, user_input: str) -> TutorState:
    """Generate vocabulary quiz/exercise"""
    
    # Extract level and topic from user input if specified
    level = "intermediate"  # Default
    if any(word in user_input.lower() for word in ["beginner", "easy"]):
        level = "beginner"
    elif any(word in user_input.lower() for word in ["advanced", "hard", "difficult"]):
        level = "advanced"
    
    quiz_prompt = f"""You are an expert English vocabulary teacher. Generate a vocabulary quiz/exercise based on the user's request.

User request: "{user_input}"

Create a vocabulary quiz at {level} level. Respond with a JSON object in this exact format:
{{
    "level": "{level}",
    "topic": "vocabulary topic/theme",
    "question": "the quiz question or instruction",
    "words": [
        {{
            "word": "word1",
            "definition": "definition of word1",
            "example": "example sentence"
        }}
    ],
    "exercise_type": "multiple-choice|fill-in-blank|matching|definition",
    "questions": [
        {{
            "question": "question text",
            "options": ["option1", "option2", "option3", "option4"],
            "correct_answer": 0,
            "explanation": "explanation of correct answer"
        }}
    ]
}}

JSON response:"""
    
    # Call Ollama for quiz generation
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert English vocabulary teacher. Always respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": quiz_prompt
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
    json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
    if json_match:
        json_str = json_match.group(0)
        try:
            quiz_data = json.loads(json_str)
            logger.info(f"Vocabulary quiz generated: {quiz_data.get('exercise_type')} at {quiz_data.get('level')} level")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse quiz JSON: {e}")
            quiz_data = _create_fallback_quiz(level)
    else:
        logger.warning("No JSON found in quiz response")
        quiz_data = _create_fallback_quiz(level)
    
    # Format quiz response
    tutor_response = f"Here's a {quiz_data.get('level', level)} level vocabulary quiz:\n\n"
    tutor_response += f"**Topic:** {quiz_data.get('topic', 'General Vocabulary')}\n\n"
    
    if quiz_data.get("questions"):
        for i, q in enumerate(quiz_data["questions"][:5], 1):  # Limit to 5 questions
            tutor_response += f"**Question {i}:** {q.get('question', '')}\n"
            if q.get("options"):
                for j, option in enumerate(q["options"]):
                    marker = "✓" if j == q.get("correct_answer", 0) else " "
                    tutor_response += f"  {chr(65 + j)}. {option} {marker}\n"
            if q.get("explanation"):
                tutor_response += f"  Explanation: {q.get('explanation')}\n"
            tutor_response += "\n"
    
    # Create chunks
    chunks = [{
        "text": tutor_response,
        "emotion": "encouraging",
        "icon": "📝",
        "pause": 0.5,
        "emphasis": False,
    }]
    
    return {
        **state,
        "current_agent": "vocabulary",
        "vocabulary_data": quiz_data,
        "tutor_response": tutor_response,
        "chunks": chunks,
        "metadata": {
            **state.get("metadata", {}),
            "agent": "vocabulary",
            "intent": "vocabulary",
            "quiz_type": quiz_data.get("exercise_type", "multiple-choice"),
            "level": quiz_data.get("level", level),
        },
        "workflow_stage": "formatting",
    }


def _create_fallback_vocabulary(user_input: str) -> Dict[str, Any]:
    """Create fallback vocabulary data"""
    return {
        "target_word": user_input,
        "part_of_speech": "unknown",
        "definitions": [
            {
                "meaning": "A word or phrase",
                "context": "general usage"
            }
        ],
        "pronunciation": "",
        "synonyms": [],
        "antonyms": [],
        "examples": [],
        "difficulty_level": "intermediate",
        "common_usage": "Commonly used word",
        "related_words": [],
    }


def _create_fallback_quiz(level: str) -> Dict[str, Any]:
    """Create fallback quiz data"""
    return {
        "level": level,
        "topic": "General Vocabulary",
        "exercise_type": "multiple-choice",
        "questions": [
            {
                "question": "What does 'happy' mean?",
                "options": ["sad", "joyful", "angry", "tired"],
                "correct_answer": 1,
                "explanation": "'Happy' means joyful or feeling good."
            }
        ]
    }

