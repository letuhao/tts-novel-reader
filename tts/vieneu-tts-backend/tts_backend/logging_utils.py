"""
Centralized logging utilities for the VieNeu TTS backend.
"""
import logging
import os
from contextlib import contextmanager
from pathlib import Path
from time import perf_counter
from typing import Optional, Any
from logging.handlers import RotatingFileHandler

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

_CONFIGURED = False


def setup_logging(force: bool = False) -> logging.Logger:
    global _CONFIGURED
    if _CONFIGURED and not force:
        return logging.getLogger("tts_backend")

    log_level_name = os.getenv("TTS_LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    output_path = LOG_DIR / "backend_output.log"
    output_handler = RotatingFileHandler(
        output_path, maxBytes=10 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    output_handler.setLevel(logging.INFO)
    output_handler.setFormatter(formatter)
    root_logger.addHandler(output_handler)

    error_path = LOG_DIR / "backend_error.log"
    error_handler = RotatingFileHandler(
        error_path, maxBytes=10 * 1024 * 1024, backupCount=1, encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root_logger.addHandler(error_handler)

    _CONFIGURED = True
    return logging.getLogger("tts_backend")


def get_logger(name: Optional[str] = None) -> logging.Logger:
    if not _CONFIGURED:
        setup_logging()
    return logging.getLogger(name or "tts_backend")


class PerformanceTracker:
    def __init__(self, logger: Optional[logging.Logger] = None, request_id: Optional[str] = None):
        self.logger = logger or get_logger("tts_backend.performance")
        self.request_id = request_id

    def _prefix(self) -> str:
        return f"[req={self.request_id}] " if self.request_id else ""

    def log(self, message: str, level: int = logging.INFO, **metadata: Any) -> None:
        meta_str = " ".join(f"{k}={v}" for k, v in metadata.items() if v is not None)
        suffix = f" ({meta_str})" if meta_str else ""
        self.logger.log(level, "%s%s%s", self._prefix(), message, suffix)

    @contextmanager
    def stage(self, name: str, **metadata: Any):
        start = perf_counter()
        try:
            yield
        finally:
            duration = (perf_counter() - start) * 1000.0
            self.log(f"Stage '{name}' completed in {duration:.2f} ms", **metadata)

    def summarize(self, total_ms: float, audio_seconds: Optional[float] = None, **metadata: Any) -> None:
        meta = dict(metadata)
        if audio_seconds and audio_seconds > 0:
            meta["audio_seconds"] = f"{audio_seconds:.2f}"
            meta["rtf"] = f"{(total_ms / 1000.0) / audio_seconds:.2f}"
        self.log(f"Request completed in {total_ms:.2f} ms", **meta)

