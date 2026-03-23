"""
Response Formatter Agent
Formats agent responses for TTS pipeline processing
"""

import logging
from datetime import datetime
from typing import Dict, Any, List
from src.models.state import TutorState

logger = logging.getLogger(__name__)


def create_chunks_from_text(text: str, max_chunk_length: int = 500) -> List[Dict[str, Any]]:
    """
    Create chunks from plain text response
    
    Args:
        text: Response text to chunk
        max_chunk_length: Maximum characters per chunk
        
    Returns:
        List of chunk dictionaries
    """
    if not text:
        return []
    
    # Simple sentence-based chunking
    sentences = text.split('. ')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        # Add period if not present
        if not sentence.endswith(('.', '!', '?', ':', ';')):
            sentence += '.'
        
        # If adding this sentence would exceed limit, finalize current chunk
        if current_chunk and len(current_chunk) + len(sentence) + 2 > max_chunk_length:
            chunks.append({
                "text": current_chunk.strip(),
                "emotion": "neutral",
                "icon": "💬",
                "pause": 0.5,
                "emphasis": False,
            })
            current_chunk = sentence
        else:
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
    
    # Add final chunk if any remaining
    if current_chunk:
        chunks.append({
            "text": current_chunk.strip(),
            "emotion": "neutral",
            "icon": "💬",
            "pause": 0.5,
            "emphasis": False,
        })
    
    return chunks if chunks else [{
        "text": text[:max_chunk_length],
        "emotion": "neutral",
        "icon": "💬",
        "pause": 0.5,
        "emphasis": False,
    }]


def get_agent_response(state: TutorState) -> str:
    """
    Get response text from appropriate agent based on current_agent
    
    Args:
        state: Current workflow state
        
    Returns:
        Response text string
    """
    current_agent = state.get("current_agent") or state.get("intent", "conversation")
    
    # Try to get response from state
    tutor_response = state.get("tutor_response")
    if tutor_response:
        return tutor_response
    
    # Agent-specific response extraction
    if current_agent == "tutor" or current_agent == "conversation":
        return state.get("tutor_response", "")
    
    elif current_agent == "grammar":
        grammar_analysis = state.get("grammar_analysis")
        if grammar_analysis:
            feedback = grammar_analysis.get("feedback", "")
            corrected_text = grammar_analysis.get("corrected_text", "")
            if feedback and corrected_text:
                return f"{feedback}\n\nCorrected text: {corrected_text}"
        return state.get("tutor_response", "")
    
    elif current_agent == "exercise":
        exercise_data = state.get("exercise_data")
        if exercise_data:
            # Format exercise data as text
            exercise_text = exercise_data.get("question", "")
            if exercise_text:
                return exercise_text
        return state.get("tutor_response", "")
    
    elif current_agent == "pronunciation":
        pronunciation_feedback = state.get("pronunciation_feedback")
        if pronunciation_feedback:
            feedback = pronunciation_feedback.get("feedback", "")
            if feedback:
                return feedback
        return state.get("tutor_response", "")
    
    # Fallback: try to get any response
    return state.get("tutor_response", "")


def enhance_chunks_with_agent_context(
    chunks: List[Dict[str, Any]], 
    state: TutorState
) -> List[Dict[str, Any]]:
    """
    Enhance chunks with agent-specific context (emotions, icons, etc.)
    
    Args:
        chunks: List of chunk dictionaries
        state: Current workflow state
        
    Returns:
        Enhanced chunks
    """
    current_agent = state.get("current_agent") or "tutor"
    intent = state.get("intent", "conversation")
    
    # Agent-specific enhancements
    agent_configs = {
        "tutor": {"emotion": "friendly", "icon": "📚"},
        "grammar": {"emotion": "supportive", "icon": "📝"},
        "exercise": {"emotion": "encouraging", "icon": "✏️"},
        "pronunciation": {"emotion": "patient", "icon": "🎤"},
    }
    
    config = agent_configs.get(current_agent, {"emotion": "neutral", "icon": "💬"})
    
    # Apply to chunks if not already set
    enhanced_chunks = []
    for chunk in chunks:
        enhanced_chunk = {
            "text": chunk.get("text", ""),
            "emotion": chunk.get("emotion") or config["emotion"],
            "icon": chunk.get("icon") or config["icon"],
            "pause": chunk.get("pause", 0.5),
            "emphasis": chunk.get("emphasis", False),
        }
        
        # Add any additional fields from original chunk
        for key, value in chunk.items():
            if key not in enhanced_chunk:
                enhanced_chunk[key] = value
        
        enhanced_chunks.append(enhanced_chunk)
    
    return enhanced_chunks


async def response_formatter_agent(state: TutorState) -> TutorState:
    """
    Response formatter agent that formats agent responses for pipeline processing
    
    This agent:
    1. Gets response from current agent
    2. Ensures chunks are properly formatted
    3. Enhances chunks with agent-specific context
    4. Updates metadata
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with formatted chunks and metadata
    """
    try:
        logger.info(f"Formatting response for agent: {state.get('current_agent', 'unknown')}")
        
        # Check for errors
        if state.get("error"):
            logger.warning(f"Skipping formatting due to error: {state.get('error')}")
            return {
                **state,
                "workflow_stage": "error",
                "tts_status": "failed",
            }
        
        # Get response text from agent
        response_text = get_agent_response(state)
        
        if not response_text:
            logger.warning("No response text found, creating fallback")
            response_text = "I'm sorry, I couldn't generate a response. Please try again."
        
        # Get or create chunks
        existing_chunks = state.get("chunks", [])
        
        if existing_chunks and all(chunk.get("text") for chunk in existing_chunks):
            # Use existing chunks if they're valid
            logger.info(f"Using {len(existing_chunks)} existing chunks")
            chunks = existing_chunks
        else:
            # Create chunks from response text
            logger.info("Creating chunks from response text")
            chunks = create_chunks_from_text(response_text)
            logger.info(f"Created {len(chunks)} chunks from text")
        
        # Enhance chunks with agent context
        chunks = enhance_chunks_with_agent_context(chunks, state)
        
        # Update metadata
        current_metadata = state.get("metadata", {})
        updated_metadata = {
            **current_metadata,
            "agent": state.get("current_agent", "unknown"),
            "intent": state.get("intent"),
            "formatted_at": datetime.now().isoformat(),
            "chunk_count": len(chunks),
            "total_text_length": sum(len(chunk.get("text", "")) for chunk in chunks),
        }
        
        logger.info(f"Response formatted: {len(chunks)} chunks, {updated_metadata['total_text_length']} characters")
        
        return {
            **state,
            "chunks": chunks,
            "metadata": updated_metadata,
            "workflow_stage": "pipeline",  # Next stage is TTS pipeline
            "tts_status": "pending",  # Ready for TTS processing
        }
        
    except Exception as e:
        logger.error(f"Error in response formatter agent: {e}", exc_info=True)
        return {
            **state,
            "error": f"Response formatting error: {str(e)}",
            "error_agent": "response_formatter",
            "workflow_stage": "error",
            "tts_status": "failed",
        }

