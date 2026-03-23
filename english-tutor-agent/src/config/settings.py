"""
Application Settings
Configuration management using Pydantic Settings
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    env: str = Field(default="development", alias="ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    
    # Database
    database_url: Optional[str] = Field(default=None, alias="DATABASE_URL")
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="english_tutor_agent", alias="DB_NAME")
    db_user: str = Field(default="english_tutor_agent", alias="DB_USER")
    db_password: str = Field(default="english_tutor_agent_password", alias="DB_PASSWORD")
    
    # Ollama
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="gemma3:12b", alias="OLLAMA_MODEL")
    # Router model (lightweight) - used by LLM router/classifier
    router_llm_model: str = Field(default="qwen3:1.7b", alias="ROUTER_LLM_MODEL")
    
    # TTS/STT
    tts_backend_url: str = Field(default="http://localhost:11111", alias="TTS_BACKEND_URL")
    stt_backend_url: str = Field(default="http://localhost:11210", alias="STT_BACKEND_URL")
    
    # API
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=11300, alias="API_PORT")
    
    # Existing System
    existing_api_url: str = Field(default="http://localhost:11200", alias="EXISTING_API_URL")
    
    # LangGraph
    langgraph_checkpoint_namespace: str = Field(
        default="english_tutor_agent",
        alias="LANGGRAPH_CHECKPOINT_NAMESPACE"
    )
    langgraph_debug: bool = Field(default=False, alias="LANGGRAPH_DEBUG")

    # Checkpointer backend selection
    # - auto: prefer Redis if configured, else Postgres if available, else in-memory
    # - redis: force Redis-backed saver
    # - postgres: force PostgresSaver (sync-only unless async saver is available)
    # - memory: force in-memory
    checkpointer_backend: str = Field(default="auto", alias="CHECKPOINTER_BACKEND")
    redis_url: Optional[str] = Field(default=None, alias="REDIS_URL")
    
    # Router Configuration
    router_mode: str = Field(default="hybrid", alias="ROUTER_MODE")  # "keyword", "llm", "hybrid"
    
    # Optional: LangSmith
    langsmith_api_key: Optional[str] = Field(default=None, alias="LANGSMITH_API_KEY")
    langsmith_project: Optional[str] = Field(default=None, alias="LANGSMITH_PROJECT")
    langsmith_tracing: bool = Field(default=False, alias="LANGSMITH_TRACING")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get global settings instance"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

