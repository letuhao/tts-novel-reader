"""
Logging Configuration
Structured logging setup
"""

import logging
import sys
from typing import Optional


def setup_logging(level: str = "INFO", format_type: str = "standard"):
    """
    Setup application logging
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_type: Log format type ('standard' or 'json')
    """
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    if format_type == "json":
        # JSON logging (for production)
        try:
            import structlog
            structlog.configure(
                processors=[
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.processors.add_log_level,
                    structlog.processors.JSONRenderer(),
                ],
                wrapper_class=structlog.make_filtering_bound_logger(log_level),
                context_class=dict,
                logger_factory=structlog.PrintLoggerFactory(),
                cache_logger_on_first_use=False,
            )
        except ImportError:
            # Fallback to standard logging if structlog not available
            format_type = "standard"
    
    if format_type == "standard":
        # Standard logging format
        logging.basicConfig(
            level=log_level,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            stream=sys.stdout,
        )


def get_logger(name: str) -> logging.Logger:
    """
    Get logger instance
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)

