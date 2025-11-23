# Code Comparison: Fast vs Slow Setup
# So sánh Code: Setup Nhanh vs Chậm

## Performance Issue / Vấn đề Hiệu suất

**8 seconds audio takes 69 seconds** - **8.6x slower than real-time!**

**8 giây audio mất 69 giây** - **Chậm hơn 8.6 lần so với real-time!**

## Key Differences / Khác biệt Chính

### OLD (Fast - Commit 4876e12) / CŨ (Nhanh)

**API (`api.py`):**
```python
# Direct call - NO executor wrapper
audio = service.synthesize(
    text=request.text,
    model=request.model,
    voice=request.voice,
    voice_file=request.voice_file,
    speed=request.speed or 1.0
)
```

**Service (`service.py`):**
```python
def synthesize(...):
    # Direct call - NO pool, NO lock
    viet_tts = self.get_viet_tts()
    return viet_tts.synthesize(...)
```

**Characteristics:**
- ✅ Direct function calls
- ✅ No executor overhead
- ✅ No Model Pool
- ✅ No warmup (CUDA kernels compile on first inference automatically)
- ✅ Simple and fast

### NEW (Slow - Current) / MỚI (Chậm)

**API (`api.py`):**
```python
# Executor wrapper - BIG OVERHEAD
audio = await loop.run_in_executor(
    None,
    partial(_synthesize_wrapper, service, ...)
)
```

**Service (`service.py`):**
```python
def synthesize(...):
    # Model Pool with queue/lock overhead
    if self.use_model_pool:
        with self.model_pool.get_model() as viet_tts:  # Queue get/put
            return viet_tts.synthesize(...)
    else:
        with self._inference_lock:  # Thread lock
            viet_tts = self.get_viet_tts()
            return viet_tts.synthesize(...)
```

**Added Overhead:**
1. ❌ **Executor wrapper** - Thread pool overhead
2. ❌ **Model Pool** - Queue operations (get/put)
3. ❌ **Warmup** - 30-60s per instance (2 instances = 60-120s startup)
4. ❌ **Thread locks** - Lock contention
5. ❌ **Multiple wrapper layers** - Function call overhead

## Root Cause / Nguyên nhân Gốc

### 1. Executor Wrapper (BIGGEST OVERHEAD) / Wrapper Executor (Overhead Lớn Nhất)

**Current:**
```python
audio = await loop.run_in_executor(None, lambda: service.synthesize(...))
```

**Overhead:**
- Thread pool creation/management
- Thread context switching
- Serialization/deserialization
- Function call indirection

**Old (Fast):**
```python
audio = service.synthesize(...)  # Direct, synchronous
```

### 2. Model Pool Queue Operations / Các Thao tác Queue của Model Pool

**Current:**
```python
with self.model_pool.get_model() as viet_tts:  # Queue.get() - blocks
    return viet_tts.synthesize(...)
# Queue.put() - returns model
```

**Overhead:**
- Queue get/put operations
- Lock acquisition/release
- Context manager overhead

**Old (Fast):**
```python
viet_tts = self.get_viet_tts()  # Direct access, cached
return viet_tts.synthesize(...)  # No queue overhead
```

### 3. Warmup Function / Hàm Warmup

**Current:**
- 30-60 seconds per instance
- 2 instances = 60-120 seconds startup delay
- Doesn't help inference speed (CUDA kernels compile automatically on first use anyway)

**Old (Fast):**
- No warmup
- First inference compiles kernels automatically
- Subsequent inferences are fast

## Solution: Revert to Simple Pattern / Giải pháp: Quay lại Pattern Đơn giản

### Remove / Loại bỏ:

1. ✅ **Executor wrapper** - Use direct calls
2. ✅ **Model Pool** - Use single instance (it was working fine!)
3. ✅ **Warmup** - Let CUDA kernels compile on first inference automatically
4. ✅ **Thread locks** - Not needed if sequential processing

### Keep / Giữ lại:

- ✅ Basic wrapper structure (for API integration)
- ✅ Device detection
- ✅ Voice selection
- ✅ Error handling

## Expected Performance After Fix / Hiệu suất Dự kiến Sau khi Sửa

- **Startup:** 60-120s → 5-10s (no warmup, no pool)
- **Inference:** 69s for 8s audio → ~8-10s for 8s audio (near real-time)
- **Throughput:** Much better (no executor/queue overhead)

- **Khởi động:** 60-120s → 5-10s (không warmup, không pool)
- **Inference:** 69s cho 8s audio → ~8-10s cho 8s audio (gần real-time)
- **Throughput:** Tốt hơn nhiều (không có executor/queue overhead)

