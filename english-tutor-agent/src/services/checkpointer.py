"""
Checkpointer Service
Manages LangGraph checkpointers (Memory for dev, PostgreSQL for prod)
"""

import logging
import os
from typing import Optional
from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)

# Try to import Redis saver (custom)
try:
    from src.services.redis_saver import RedisSaver
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False
    RedisSaver = None  # type: ignore

# Try to import PostgreSQL checkpointer (may not be available)
try:
    from langgraph.checkpoint.postgres import PostgresSaver
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    logger.warning("PostgresSaver not available. Install langgraph-checkpoint-postgres for PostgreSQL support.")


def _postgres_saver_supports_async() -> bool:
    """Return True if PostgresSaver overrides async methods (aget/aget_tuple/etc).

    Current known behavior (langgraph-checkpoint-postgres 3.0.2): async methods are
    not implemented and fall back to BaseCheckpointSaver stubs that raise
    NotImplementedError.
    """
    if not POSTGRES_AVAILABLE:
        return False
    try:
        from langgraph.checkpoint.base import BaseCheckpointSaver

        # If PostgresSaver doesn't override BaseCheckpointSaver.aget_tuple,
        # async checkpointing is effectively unsupported.
        return PostgresSaver.aget_tuple is not BaseCheckpointSaver.aget_tuple  # type: ignore[attr-defined]
    except Exception:
        return False


def create_checkpointer(
    database_url: Optional[str] = None,
    redis_url: Optional[str] = None,
    backend: str = "auto",
    namespace: str = "english_tutor_agent",
    force_memory: bool = False,
    require_async: bool = False,
):
    """
    Create checkpointer instance
    
    Args:
        database_url: Optional PostgreSQL connection string
        force_memory: Force use MemorySaver (useful for tests)
        require_async: Require async-capable checkpointer (for ainvoke/astream usage)
        
    Returns:
        Checkpointer instance (MemorySaver for dev, PostgresSaver for prod)
        
    Note:
        PostgresSaver.from_conn_string() returns a context manager.
        LangGraph can accept context managers passed into workflow.compile(checkpointer=...)
        and will handle entering/exiting them appropriately.
    """
    # Force MemorySaver if requested (useful for tests)
    if force_memory:
        logger.info("Using MemorySaver checkpointer (forced)")
        return MemorySaver()

    backend = (backend or "auto").lower().strip()

    # Redis-backed saver (preferred for async workflows)
    if backend in ("redis", "auto") and redis_url and REDIS_AVAILABLE:
        try:
            logger.info("Creating Redis checkpointer (RedisSaver)")
            return RedisSaver(redis_url, namespace=namespace)
        except Exception as e:
            logger.warning(f"Failed to create RedisSaver: {e}. Falling back to next option.")
    
    # If database_url is provided and PostgreSQL is available, use PostgreSQL
    if backend in ("postgres", "auto") and database_url and POSTGRES_AVAILABLE:
        try:
            if require_async and not _postgres_saver_supports_async():
                logger.warning(
                    "PostgresSaver async methods are not implemented in the installed version. "
                    "Falling back to RedisSaver (if configured) or MemorySaver for async workflows. "
                    "Use app.invoke() (sync) with PostgresSaver, or upgrade when async support is available."
                )
                if redis_url and REDIS_AVAILABLE:
                    try:
                        return RedisSaver(redis_url, namespace=namespace)
                    except Exception:
                        pass
                return MemorySaver()

            logger.info(f"Creating PostgreSQL checkpointer")
            # Hide password in log
            db_display = database_url.split('@')[1] if '@' in database_url else 'configured'
            logger.debug(f"Database: {db_display}")
            
            # PostgresSaver.from_conn_string returns a context manager; LangGraph will handle it at compile/runtime.
            checkpointer = PostgresSaver.from_conn_string(database_url)
            
            logger.info("PostgreSQL checkpointer created successfully (context manager)")
            return checkpointer  # type: ignore
        except Exception as e:
            logger.warning(f"Failed to create PostgreSQL checkpointer: {e}. Falling back to MemorySaver.")
            import traceback
            logger.debug(traceback.format_exc())
            return MemorySaver()
    
    # Default to MemorySaver for development
    logger.info("Using MemorySaver checkpointer (development mode)")
    return MemorySaver()


def get_checkpointer(force_memory: bool = False, require_async: bool = False):
    """
    Get checkpointer instance from environment
    
    Args:
        force_memory: Force use MemorySaver (useful for tests)
        require_async: Require async-capable checkpointer (for ainvoke/astream usage)
    
    Returns:
        Checkpointer instance
    """
    from src.config import get_settings
    settings = get_settings()
    backend = getattr(settings, "checkpointer_backend", "auto")
    redis_url = getattr(settings, "redis_url", None)
    namespace = getattr(settings, "langgraph_checkpoint_namespace", "english_tutor_agent")
    
    # Use DATABASE_URL if available
    database_url = settings.database_url
    
    # If no DATABASE_URL, try to construct from individual settings
    if not database_url and settings.db_host != "localhost":
        database_url = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
    
    return create_checkpointer(
        database_url,
        redis_url=redis_url,
        backend=backend,
        namespace=namespace,
        force_memory=force_memory,
        require_async=require_async,
    )

