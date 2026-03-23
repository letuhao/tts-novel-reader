"""
Pipeline Node - TTS Processing
Processes formatted chunks through TTS service and saves audio files
"""

import logging
from datetime import datetime
from typing import Dict, Any, List
from src.models.state import TutorState
from src.services.tts_service import synthesize_speech, get_audio_url

logger = logging.getLogger(__name__)


async def pipeline_agent(state: TutorState) -> TutorState:
    """
    Pipeline agent that processes chunks through TTS service
    
    This agent:
    1. Takes chunks from response formatter
    2. Processes each chunk through TTS
    3. Updates chunks with audio metadata
    4. Updates state with TTS status
    
    Args:
        state: Current workflow state with formatted chunks
        
    Returns:
        Updated state with TTS-processed chunks and audio metadata
    """
    try:
        logger.info("Starting TTS pipeline processing")
        
        # Check for errors from previous stages
        if state.get("error"):
            logger.warning(f"Skipping TTS pipeline due to error: {state.get('error')}")
            return {
                **state,
                "workflow_stage": "error",
                "tts_status": "failed",
            }
        
        chunks = state.get("chunks", [])
        if not chunks:
            logger.warning("No chunks to process")
            return {
                **state,
                "tts_status": "failed",
                "error": "No chunks to process in TTS pipeline",
                "workflow_stage": "error",
            }
        
        logger.info(f"Processing {len(chunks)} chunks through TTS")
        
        # Process each chunk
        processed_chunks = []
        failed_count = 0
        completed_count = 0
        
        for i, chunk in enumerate(chunks):
            chunk_text = chunk.get("text", "")
            if not chunk_text:
                logger.warning(f"Chunk {i+1} has no text, skipping")
                processed_chunks.append({
                    **chunk,
                    "tts_status": "failed",
                    "tts_error": "Empty chunk text",
                })
                failed_count += 1
                continue
            
            try:
                logger.info(f"Processing chunk {i+1}/{len(chunks)}: {len(chunk_text)} chars")
                
                # Get TTS options from chunk or use defaults (Coqui XTTS format)
                tts_options = chunk.get("tts_options", {})
                model = tts_options.get("model", "xtts-english")  # Coqui XTTS model
                # Use a valid English speaker as default (Ana Florence is a good English voice)
                speaker = tts_options.get("speaker", "Ana Florence")  # Speaker name
                language = tts_options.get("language", "en")  # Language code
                
                # Mark chunk as processing
                chunk["tts_status"] = "processing"
                
                # Call TTS service (Coqui XTTS backend)
                tts_result = await synthesize_speech(
                    text=chunk_text,
                    model=model,
                    speaker=speaker,
                    language=language,
                    return_audio=False,  # Get metadata only
                    store=True,
                    expiry_hours=24,  # Default 24 hours
                )
                
                # Extract file metadata (backend returns file_metadata object or file_id at top level)
                file_metadata = tts_result.get("file_metadata") or {}
                file_id = tts_result.get("file_id") or file_metadata.get("file_id")
                
                if not file_id:
                    raise ValueError("No file_id in TTS response")
                
                # Get audio URL
                audio_url = await get_audio_url(file_id)
                
                # Update chunk with audio metadata
                processed_chunk = {
                    **chunk,
                    "tts_status": "completed",
                    "audio_file_id": file_id,
                    "audio_url": audio_url,
                    "audio_duration": tts_result.get("duration_seconds", 0),
                    "audio_sample_rate": tts_result.get("sample_rate", 24000),
                    "audio_expires_at": tts_result.get("expires_at") or file_metadata.get("expires_at"),
                    "tts_request_id": tts_result.get("request_id"),
                    "tts_model": tts_result.get("model", model),
                }
                
                processed_chunks.append(processed_chunk)
                completed_count += 1
                
                logger.info(f"Chunk {i+1} processed successfully: file_id={file_id}")
                
            except Exception as e:
                logger.error(f"TTS error for chunk {i+1}: {e}", exc_info=True)
                processed_chunk = {
                    **chunk,
                    "tts_status": "failed",
                    "tts_error": str(e),
                }
                processed_chunks.append(processed_chunk)
                failed_count += 1
        
        # Determine overall TTS status
        if completed_count == len(chunks):
            overall_status = "completed"
        elif failed_count == len(chunks):
            overall_status = "failed"
        else:
            overall_status = "partial"  # Some succeeded, some failed
        
        # Update metadata
        current_metadata = state.get("metadata", {})
        updated_metadata = {
            **current_metadata,
            "tts_completed_at": datetime.now().isoformat(),
            "tts_completed_chunks": completed_count,
            "tts_failed_chunks": failed_count,
            "tts_total_chunks": len(chunks),
        }
        
        logger.info(
            f"TTS pipeline completed: {completed_count}/{len(chunks)} chunks successful, "
            f"status={overall_status}"
        )
        
        return {
            **state,
            "chunks": processed_chunks,
            "tts_status": overall_status,
            "metadata": updated_metadata,
            "workflow_stage": "complete",
        }
        
    except Exception as e:
        logger.error(f"Error in pipeline agent: {e}", exc_info=True)
        return {
            **state,
            "error": f"TTS pipeline error: {str(e)}",
            "error_agent": "pipeline",
            "workflow_stage": "error",
            "tts_status": "failed",
        }

