# Fix for VieNeu-TTS HubertModel Import Error

## Problem

When trying to use VieNeu-TTS, you get:
```
ImportError: cannot import name 'HubertModel' from 'transformers'
```

## Root Cause

1. **neucodec** package tries to import `HubertModel` from transformers top-level
2. **transformers 4.57.1** doesn't export `HubertModel` at top level (it exists in submodule)
3. **torchao** incompatibility with PyTorch 2.5.1 also prevents transformers from loading properly

## Solutions

### Option 1: Use Compatible transformers Version (Recommended)

Downgrade transformers to a version compatible with neucodec:

```powershell
cd D:\Works\source\novel-reader\app
.\.venv\Scripts\pip.exe install "transformers>=4.40.0,<4.46.0"
```

This version range should work with neucodec and doesn't have the torchao dependency issue.

### Option 2: Patch torchao Compatibility

If you must use transformers 4.57.1, patch torchao before importing:

```python
# Add this before importing transformers or neucodec
import torch
if not hasattr(torch, 'int1'):
    # Patch missing int1 for torchao compatibility
    torch.int1 = torch.int8  # Use int8 as fallback
```

### Option 3: Update torchao

Try updating torchao to latest version:

```powershell
.\.venv\Scripts\pip.exe install --upgrade torchao
```

## Quick Fix Applied

I've updated `app/tts_backend/models/vieneu_tts.py` to:
1. Try to patch `HubertModel` to transformers top-level before importing neucodec
2. Handle the import gracefully

However, the torchao compatibility issue needs to be resolved first.

## Recommended Action

Since VieNeu-TTS was working yesterday, check what transformers version you were using:

```powershell
# Check your working environment
python -c "import transformers; print(transformers.__version__)"
```

Then use that same version in the app environment:

```powershell
cd D:\Works\source\novel-reader\app
.\.venv\Scripts\pip.exe install "transformers==<working_version>"
```

## Test After Fix

```powershell
cd D:\Works\source\novel-reader\app
.\.venv\Scripts\python.exe -c "from tts_backend.models.vieneu_tts import VieNeuTTSWrapper; print('Success!')"
```

