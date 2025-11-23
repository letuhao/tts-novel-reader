"""
TTS Model Wrappers
Wrappers cho Model TTS
"""

# Lazy imports - only import when needed
# Import lười - chỉ import khi cần

__all__ = ["VieNeuTTSWrapper", "DiaTTSWrapper"]

def __getattr__(name):
    """Lazy import models when accessed / Import lười model khi được truy cập"""
    if name == "VieNeuTTSWrapper":
        from .vieneu_tts import VieNeuTTSWrapper
        return VieNeuTTSWrapper
    elif name == "DiaTTSWrapper":
        from .dia_tts import DiaTTSWrapper
        return DiaTTSWrapper
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

