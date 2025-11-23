# Performance Comparison: Original vs Current Setup
# So sánh Hiệu suất: Setup Gốc vs Setup Hiện tại

## Problem / Vấn đề

**Original setup** (same as `viet-tts`): **Near real-time** performance ⚡  
**Current setup** (after optimizations): **Very slow** 🐌

**Setup gốc** (giống `viet-tts`): Hiệu suất **gần real-time** ⚡  
**Setup hiện tại** (sau tối ưu hóa): **Rất chậm** 🐌

## Original Setup (Fast) / Setup Gốc (Nhanh)

**File:** `tts/viet-tts/viettts/server.py`

### Simple Initialization / Khởi tạo Đơn giản
```python
@app.on_event("startup")
async def startup():
    global tts_obj
    tts_obj = TTS('./pretrained-models')  # Direct, simple
```

### Direct Inference / Inference Trực tiếp
```python
model_output = tts_obj.inference_tts(
    tts_text=text,
    prompt_speech_16k=prompt_speech_16k,
    speed=speed,
    stream=False
)
```

### Characteristics / Đặc điểm:
- ✅ **Direct model instantiation** / Khởi tạo model trực tiếp
- ✅ **No wrapper layers** / Không có lớp wrapper
- ✅ **No warmup** / Không warmup
- ✅ **No executor** / Không executor
- ✅ **No pool** / Không pool
- ✅ **Minimal overhead** / Overhead tối thiểu
- ✅ **Near real-time** / Gần real-time

## Current Setup (Slow) / Setup Hiện tại (Chậm)

### Multiple Layers / Nhiều Lớp:

```
Request → API (async/executor) → Service (pool) → Model Pool (queue) → Wrapper → TTS → Model
```

### Performance Overhead / Overhead Hiệu suất:

#### 1. Model Pool Initialization / Khởi tạo Model Pool
- **Time:** 60-120 seconds (2 instances × 30-60s warmup each)
- **Thời gian:** 60-120 giây (2 instances × 30-60s warmup mỗi instance)
- **Impact:** Slow startup / Khởi động chậm

#### 2. Warmup Function / Hàm Warmup
- **Time:** 30-60 seconds per instance
- **Thời gian:** 30-60 giây mỗi instance
- **Impact:** Adds startup delay / Thêm độ trễ khởi động

#### 3. Executor Wrapper / Wrapper Executor
```python
audio = await loop.run_in_executor(None, lambda: service.synthesize(...))
```
- **Impact:** Thread pool overhead, context switching / Overhead thread pool, chuyển context

#### 4. Model Pool Queue / Hàng đợi Model Pool
```python
with self.model_pool.get_model() as viet_tts:
    return viet_tts.synthesize(...)
```
- **Impact:** Queue get/put overhead, lock contention / Overhead get/put queue, xung đột lock

#### 5. Multiple Wrapper Layers / Nhiều Lớp Wrapper
- API layer → Service layer → Pool → Wrapper → TTS → Model
- **Impact:** Function call overhead / Overhead gọi hàm

#### 6. Text Validation / Xác thực Văn bản
```python
meaningful_text = ''.join(c for c in text if c.isalnum() or c.isspace()).strip()
```
- **Impact:** String processing overhead / Overhead xử lý string

#### 7. Audio Conversion / Chuyển đổi Audio
```python
audio_buffer = io.BytesIO()
sf.write(audio_buffer, audio, sample_rate, format="WAV")
```
- **Impact:** Format conversion overhead / Overhead chuyển đổi format

## What Made It Fast / Điều Gì Làm Nó Nhanh

1. **Direct Calls / Gọi Trực tiếp:**
   ```python
   tts_obj = TTS(model_dir)  # Simple
   output = tts_obj.inference_tts(...)  # Direct
   ```

2. **No Warmup / Không Warmup:**
   - First inference compiles CUDA kernels automatically
   - Subsequent inferences are fast
   - Inference đầu tiên tự động compile CUDA kernels
   - Các inference tiếp theo nhanh

3. **No Pool / Không Pool:**
   - Single instance, direct access
   - No queue overhead
   - Một instance, truy cập trực tiếp
   - Không có overhead queue

4. **No Executor / Không Executor:**
   - Direct function calls
   - No thread switching
   - Gọi hàm trực tiếp
   - Không chuyển thread

5. **Minimal Validation / Xác thực Tối thiểu:**
   - Let model handle edge cases
   - No extra processing
   - Để model xử lý edge cases
   - Không xử lý thêm

## Solution: Simplify to Original Pattern / Giải pháp: Đơn giản hóa về Pattern Gốc

### Remove These / Loại bỏ Các Thứ Này:

1. ✅ **Model Pool** (use single instance)
2. ✅ **Warmup** (let first inference compile kernels)
3. ✅ **Executor wrapper** (direct calls)
4. ✅ **Extra validation** (minimal checks only)

### Keep These / Giữ lại Các Thứ Này:

- ✅ Basic wrapper for API integration
- ✅ Error handling
- ✅ Device detection
- ✅ Voice selection logic

## Expected Performance / Hiệu suất Dự kiến

After simplifying:
- **Startup:** 60-120s → 5-10s
- **First inference:** Same (CUDA kernels compile automatically)
- **Subsequent inference:** Near real-time (like original)

Sau khi đơn giản hóa:
- **Khởi động:** 60-120s → 5-10s
- **Inference đầu tiên:** Giống nhau (CUDA kernels tự động compile)
- **Inference tiếp theo:** Gần real-time (như gốc)
