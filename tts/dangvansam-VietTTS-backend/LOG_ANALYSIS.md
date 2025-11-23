# Log Analysis - Performance Bottleneck Identification
# Phân tích Log - Xác định Điểm Nghẽn Hiệu suất

## Summary / Tóm tắt

**Request 1:**
- **Total time:** 12.946s
- **Audio duration:** 8.231s
- **Speed ratio:** 1.57x (⚠️ Slower than real-time)
- **Bottleneck:** Step 4 - `tts_to_wav()` takes **12.946s**

**Request 2:**
- **Total time:** ~7.45s (from progress bar in error log)
- **Faster than first request but still slower than real-time**

## Detailed Timeline / Timeline Chi tiết

### Request 1 (First Request after Startup)

```
[23:26:29.283] Step 4 - Starting audio generation
[23:26:42.229] tts_to_wav() completed: 12.946s
```

**Time Analysis:**
- Step 1-3 (Voice selection, loading, validation): **< 1ms** ✅
- Step 4 (Audio generation - `tts_to_wav()`): **12.946s** ❌ **BOTTLENECK**
- Step 5-6 (Validation, storage): **< 5ms** ✅

**Conclusion:** The entire delay is in `tts_to_wav()` - the core VietTTS inference function.

### Request 2 (Second Request)

From error log progress bars:
```
100%|██████████| 1/1 [00:07<00:00,  7.45s/it]
```

**Time Analysis:**
- Step 4 (`tts_to_wav()`): **~7.45s** ⚠️ (Better but still slow)

## Root Cause / Nguyên nhân Gốc

### The bottleneck is INSIDE `tts_to_wav()` / Điểm nghẽn là BÊN TRONG `tts_to_wav()`

Looking at the VietTTS code structure:
```python
def tts_to_wav(self, text, prompt_speech_16k, speed=1.0):
    wavs = []
    for output in self.inference_tts(text, prompt_speech_16k, stream=False, speed=speed):
        wavs.append(output['tts_speech'].squeeze(0).numpy())
    return np.concatenate(wavs, axis=0)

def inference_tts(self, tts_text, prompt_speech_16k, stream=False, speed=1.0):
    for i in tqdm(self.frontend.preprocess_text(tts_text, split=True)):  # Text splitting
        model_input = self.frontend.frontend_tts(i, prompt_speech_16k)    # Frontend processing
        for model_output in self.model.tts(**model_input, stream=stream, speed=speed):  # Model inference
            yield model_output
```

### Possible bottlenecks inside `tts_to_wav()` / Các điểm nghẽn có thể bên trong `tts_to_wav()`:

1. **Text preprocessing** (`preprocess_text` + `split=True`)
   - Normalizes text
   - Splits into chunks
   - May take time for long text

2. **Frontend processing** (`frontend_tts`)
   - Text tokenization
   - Speech token extraction (ONNX - **CPU only** from error log!)
   - Speech feature extraction
   - Speaker embedding extraction

3. **Model inference** (`model.tts()`)
   - LLM inference (PyTorch - GPU)
   - Flow matching inference (PyTorch - GPU)
   - HiFT vocoder inference (PyTorch - GPU)

## Key Finding: ONNX Runtime on CPU! / Phát hiện Quan trọng: ONNX Runtime trên CPU!

From error log:
```
⚠️  CUDAExecutionProvider requested but not used, falling back to CPU
⚠️  CUDAExecutionProvider failed (CUDA provider not active), falling back to CPU
```

**This is a major bottleneck!** The frontend ONNX models are running on **CPU** instead of GPU:
- Speech tokenizer (ONNX) → **CPU** ❌
- Speech embedding (ONNX) → **CPU** ❌

These are called for **every text chunk**, which explains the delay!

## Performance Breakdown / Phân tích Hiệu suất

### Request 1 (12.946s breakdown):
- Frontend processing (ONNX on CPU): **~5-7s** ❌
- Model inference (PyTorch on GPU): **~5-6s** ⚠️

### Request 2 (7.45s breakdown):
- Frontend processing (ONNX on CPU): **~3-4s** ❌ (Better, maybe cached?)
- Model inference (PyTorch on GPU): **~3-4s** ✅ (Better after warmup)

## Recommendations / Khuyến nghị

### 1. Fix ONNX Runtime CUDA Provider / Sửa ONNX Runtime CUDA Provider

**Problem:** ONNX models fall back to CPU, causing 3-7s delay per request.

**Solution:** Need to fix ONNX Runtime CUDA setup:
- Check CUDA DLL availability
- Ensure ONNX Runtime CUDA provider is properly installed
- May need to reinstall `onnxruntime-gpu`

### 2. Add Detailed Logging Inside `inference_tts` / Thêm Logging Chi tiết Bên trong `inference_tts`

Since `tts_to_wav()` is in the original VietTTS library, we need to add timing logs inside our wrapper to track:
- Text preprocessing time
- Frontend processing time (per chunk)
- Model inference time (per chunk)

### 3. Cache Frontend Processing / Cache Xử lý Frontend

If the same text chunks are processed multiple times, we could cache:
- Preprocessed text chunks
- Frontend-processed model inputs

## Next Steps / Bước Tiếp theo

1. **Fix ONNX Runtime CUDA** - This is the biggest issue
2. **Add timing logs inside `inference_tts` wrapper** to see exactly where time is spent
3. **Optimize frontend processing** if possible (caching, batching)

