"""
State Schema for LangGraph Workflow
Based on STATE_SCHEMA_DETAILED.md
"""

from typing import TypedDict, List, Optional, Literal, Dict, Any
from langchain_core.messages import BaseMessage


class TutorState(TypedDict, total=False):
    """
    Complete state schema for English Tutor workflow
    
    Note: TypedDict with total=False means all fields are optional
    We'll validate required fields in each node
    """
    
    # ==================== Messages ====================
    messages: List[BaseMessage]
    """Conversation history as LangChain messages"""
    
    # ==================== Conversation Info ====================
    conversation_id: str
    """Unique conversation identifier"""
    
    user_id: str
    """User identifier"""
    
    # ==================== Routing ====================
    intent: Optional[Literal[
        "conversation",
        "grammar",
        "pronunciation",
        "exercise",
        "vocabulary",
        "translation",
        "unknown"
    ]]
    """Detected user intent"""
    
    current_agent: Optional[str]
    """Current agent processing the request"""
    
    previous_agent: Optional[str]
    """Previous agent (for debugging)"""
    
    routing_confidence: Optional[float]
    """Confidence score of intent detection (0.0 - 1.0)"""
    
    # ==================== Agent Responses ====================
    tutor_response: Optional[str]
    """Full response from tutor agent"""
    
    grammar_analysis: Optional[Dict[str, Any]]
    """Grammar analysis result"""
    
    pronunciation_feedback: Optional[Dict[str, Any]]
    """Pronunciation feedback"""
    
    exercise_data: Optional[Dict[str, Any]]
    """Exercise data"""
    
    vocabulary_data: Optional[Dict[str, Any]]
    """Vocabulary data (definitions, synonyms, examples, etc.)"""
    
    translation_data: Optional[Dict[str, Any]]
    """Translation data (source, target, alternatives, etc.)"""
    
    # ==================== Pipeline Data ====================
    chunks: List[Dict[str, Any]]
    """Structured response chunks"""
    
    tts_status: Optional[Literal["pending", "processing", "completed", "failed"]]
    """Overall TTS processing status"""
    
    audio_data: Optional[Dict[str, Any]]
    """Audio data for chunks"""
    
    # ==================== Metadata ====================
    metadata: Dict[str, Any]
    """Additional metadata"""
    
    # ==================== Error Handling ====================
    error: Optional[str]
    """Error message if processing failed"""
    
    error_stack: Optional[str]
    """Error stack trace for debugging"""
    
    error_agent: Optional[str]
    """Agent where error occurred"""
    
    retry_count: Optional[int]
    """Number of retry attempts"""
    
    # ==================== Control Flow ====================
    should_continue: Optional[bool]
    """Whether to continue workflow"""
    
    should_retry: Optional[bool]
    """Whether to retry current step"""
    
    workflow_stage: Optional[Literal[
        "routing",
        "processing",
        "formatting",
        "pipeline",
        "complete",
        "error"
    ]]
    """Current stage of workflow"""
    
    # ==================== Performance Tracking ====================
    timestamps: Optional[Dict[str, float]]
    """Performance timestamps"""
    
    performance_metrics: Optional[Dict[str, Any]]
    """Performance metrics"""

