__all__ = ["XTTSEnglishWrapper"]

def __getattr__(name):
    """Lazy import models when accessed / Import lười model khi được truy cập"""
    if name == "XTTSEnglishWrapper":
        from .xtts_english import XTTSEnglishWrapper
        return XTTSEnglishWrapper
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

