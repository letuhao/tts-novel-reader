# Troubleshooting Guide

Common issues and solutions for the STT backend service.

## Table of Contents

- [Service Won't Start](#service-wont-start)
- [Model Loading Issues](#model-loading-issues)
- [CUDA/GPU Issues](#cudagpu-issues)
- [Performance Issues](#performance-issues)
- [API Errors](#api-errors)
- [Memory Issues](#memory-issues)

---

## Service Won't Start

### Port Already in Use

**Error:**
```
ERROR: [Errno 48] Address already in use
```

**Solution:**
```powershell
# Find and stop process on port 11210
Get-NetTCPConnection -LocalPort 11210 | Stop-Process -Force

# Or use the stop script
.\stop_backend.ps1
```

### Import Errors

**Error:**
```
ModuleNotFoundError: No module named 'faster_whisper'
```

**Solution:**
```bash
pip install -r requirements.txt
```

### Missing Dependencies

**Error:**
```
ImportError: cannot import name 'X' from 'Y'
```

**Solution:**
```bash
# Reinstall all dependencies
pip install --upgrade -r requirements.txt
```

---

## Model Loading Issues

### Model Not Found

**Error:**
```
FileNotFoundError: Model path does not exist
```

**Solution:**
1. Verify model exists:
   ```bash
   ls models/faster-whisper-large-v3/model.bin
   ```

2. Check path in `stt_backend/config.py`:
   ```python
   FASTER_WHISPER_MODEL_PATH = MODELS_DIR / "faster-whisper-large-v3"
   ```

3. Ensure correct working directory:
   ```bash
   # Run from stt/ directory
   cd stt
   python main.py
   ```

### Model Loading Slow

**Issue:** First request takes a long time

**Explanation:** This is normal. The model is loaded on first request or at startup.

**Solution:**
- Model is preloaded at startup (see `main.py`)
- First request may still take 5-10 seconds
- Subsequent requests are fast

---

## CUDA/GPU Issues

### CUDA Not Available

**Error:**
```
RuntimeError: CUDA not available
```

**Solution:**
1. **Check GPU:**
   ```powershell
   nvidia-smi
   ```

2. **Install CUDA Toolkit:**
   - Download from [NVIDIA](https://developer.nvidia.com/cuda-downloads)
   - Install version 11.8 or 12.x

3. **Use CPU mode (temporary):**
   ```bash
   export STT_DEVICE=cpu
   python main.py
   ```

### CUDA Out of Memory

**Error:**
```
RuntimeError: CUDA out of memory
```

**Solution:**
1. **Use INT8 quantization:**
   ```bash
   export STT_COMPUTE_TYPE=int8_float16
   ```

2. **Close other GPU applications:**
   - Close other ML models
   - Close games/GPU-intensive apps

3. **Use CPU mode:**
   ```bash
   export STT_DEVICE=cpu
   ```

### GPU Not Detected

**Issue:** Service uses CPU even with GPU available

**Solution:**
1. **Verify CUDA:**
   ```python
   import torch
   print(torch.cuda.is_available())
   ```

2. **Check device setting:**
   ```bash
   export STT_DEVICE=cuda
   ```

3. **Reinstall PyTorch with CUDA:**
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

---

## Performance Issues

### Slow Transcription

**Issue:** Transcription is slower than expected

**Solutions:**
1. **Use GPU:**
   ```bash
   export STT_DEVICE=cuda
   ```

2. **Optimize compute type:**
   ```bash
   export STT_COMPUTE_TYPE=float16  # Best balance
   # Or
   export STT_COMPUTE_TYPE=int8_float16  # Faster
   ```

3. **Reduce beam size:**
   - Lower `beam_size` parameter (default: 5)
   - Try `beam_size=1` for faster inference

4. **Disable word timestamps:**
   - Set `word_timestamps=false` (default)

### High CPU Usage

**Issue:** High CPU usage even with GPU

**Explanation:** Audio preprocessing happens on CPU

**Solution:**
- Reduce `STT_NUM_WORKERS` (default: 4)
- Try `STT_NUM_WORKERS=2`

---

## API Errors

### 400 Bad Request

**Error:**
```json
{
  "detail": "Audio file is required"
}
```

**Solution:**
- Ensure audio file is included in request
- Check file format is supported
- Verify file is not corrupted

### 500 Internal Server Error

**Error:**
```json
{
  "detail": "Transcription failed: ..."
}
```

**Solution:**
1. **Check service logs:**
   - Look for error messages in console
   - Check for model loading issues

2. **Verify audio file:**
   - Ensure file is valid audio format
   - Check file is not corrupted
   - Try a different audio file

3. **Check service health:**
   ```bash
   curl http://localhost:11210/health
   ```

### Connection Refused

**Error:**
```
Connection refused
```

**Solution:**
1. **Check service is running:**
   ```bash
   curl http://localhost:11210/health
   ```

2. **Verify port:**
   - Check `STT_API_PORT` environment variable
   - Default is 11210

3. **Check firewall:**
   - Ensure port 11210 is not blocked

---

## Memory Issues

### Out of Memory (GPU)

**Error:**
```
CUDA out of memory
```

**Solutions:**
1. **Use INT8 quantization:**
   ```bash
   export STT_COMPUTE_TYPE=int8_float16
   ```

2. **Close other applications:**
   - Close other GPU-using programs
   - Free up VRAM

3. **Use CPU mode:**
   ```bash
   export STT_DEVICE=cpu
   ```

### Out of Memory (System RAM)

**Error:**
```
MemoryError: Unable to allocate array
```

**Solutions:**
1. **Reduce workers:**
   ```bash
   export STT_NUM_WORKERS=2
   ```

2. **Process smaller audio files:**
   - Split large files into chunks
   - Process one at a time

3. **Close other applications:**
   - Free up system RAM

---

## Common Solutions Summary

| Issue | Quick Fix |
|-------|-----------|
| Port in use | `.\stop_backend.ps1` |
| Model not found | Check `models/faster-whisper-large-v3/` exists |
| CUDA not available | Use `STT_DEVICE=cpu` |
| Out of memory | Use `STT_COMPUTE_TYPE=int8_float16` |
| Slow performance | Use GPU with `STT_DEVICE=cuda` |
| Import errors | `pip install -r requirements.txt` |

---

## Getting Help

If issues persist:

1. **Check logs:**
   - Service console output
   - Error messages

2. **Verify setup:**
   ```bash
   python verify_setup.py
   ```

3. **Test with simple audio:**
   - Use a short, clear audio file
   - Test with different formats

4. **Review documentation:**
   - [Installation Guide](./INSTALLATION.md)
   - [Configuration Guide](./CONFIGURATION.md)
   - [API Reference](./API_REFERENCE.md)

---

## See Also

- [Installation Guide](./INSTALLATION.md) - Installation troubleshooting
- [Configuration Guide](./CONFIGURATION.md) - Configuration options
- [Performance Guide](./PERFORMANCE.md) - Performance optimization

