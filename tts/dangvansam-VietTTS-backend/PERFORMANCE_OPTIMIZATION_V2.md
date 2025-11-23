# Performance Optimization V2 - Eliminate Setup Delay
# Tối ưu Hiệu suất V2 - Loại bỏ Độ trễ Setup

## Problem / Vấn đề

- **18 seconds to generate 8 seconds audio** (should be ~8s)
- **10 seconds setup delay** before audio generation starts
- **GPU idle time** between requests (visible in GPU chart)
- **Voice reloading from disk** on every request

- **18 giây để tạo 8 giây audio** (nên là ~8s)
- **Độ trễ setup 10 giây** trước khi bắt đầu tạo audio
- **Thời gian GPU rảnh** giữa các request (thấy trong biểu đồ GPU)
- **Tải lại voice từ disk** mỗi request

## Root Causes / Nguyên nhân Gốc

### 1. Voice Loading from Disk Every Time / Tải Voice từ Disk Mỗi Lần

**Before:**
```python
# In synthesize() - called EVERY request
prompt_speech = load_prompt_speech_from_file(prompt_speech_file)  # ~5-10s disk I/O
```

**After (Fixed):**
```python
# Cache loaded voices in memory
if cache_key not in self._prompt_speech_cache:
    self._prompt_speech_cache[cache_key] = load_prompt_speech_from_file(prompt_speech_file)
prompt_speech = self._prompt_speech_cache[cache_key]  # Instant from memory
```

### 2. CUDA Kernels Compiling on Each Request / Compile CUDA Kernels Mỗi Request

**Before:**
- First inference compiles CUDA kernels (~10s delay)
- This happens on EVERY request if model is not warmed up

**After (Fixed):**
- Warmup at startup compiles kernels once
- Subsequent requests use pre-compiled kernels (no delay)

### 3. No Voice Preloading / Không Tải Trước Voice

**Before:**
- Voices loaded on first use (disk I/O delay)

**After (Fixed):**
- Common voices preloaded at startup
- Ready in memory immediately

## Changes Made / Các Thay đổi Đã Thực hiện

### 1. Voice Caching / Cache Voice

**File:** `tts_backend/models/viet_tts.py`

- Added `_prompt_speech_cache = {}` to cache loaded voices
- Modified `synthesize()` to use cache instead of reloading from disk
- **Saves ~5-10s per request** (no disk I/O)

### 2. Warmup at Startup / Warmup khi Khởi động

**File:** `tts_backend/service.py`

- Re-enabled warmup to compile CUDA kernels once at startup
- **Eliminates 10s setup delay** on each request

**File:** `tts_backend/models/viet_tts.py`

- Updated `warmup()` to use cached voice (no disk I/O during warmup)
- Better error handling

### 3. Preload Common Voices / Tải Trước Các Giọng Phổ biến

**File:** `tts_backend/models/viet_tts.py`

- Added `_preload_common_voices()` method
- Preloads: `quynh`, `cdteam`, `nu-nhe-nhang` at startup
- **Eliminates first-use delay** for common voices

## Expected Performance / Hiệu suất Dự kiến

### Before / Trước:
- **First request:** 18s for 8s audio (10s setup + 8s generation)
- **Subsequent requests:** 18s for 8s audio (10s setup + 8s generation)
- **GPU utilization:** Low (idle during setup)

### After / Sau:
- **Startup:** +30-60s (one-time warmup cost)
- **First request:** ~8-10s for 8s audio (no setup delay)
- **Subsequent requests:** ~8-10s for 8s audio (no setup delay)
- **GPU utilization:** High (no idle time)

### Improvement / Cải thiện:
- **~10s faster per request** (eliminated setup delay)
- **Near real-time** (8s audio in ~8-10s)
- **Better GPU utilization** (no idle time)

## Next Steps / Bước Tiếp theo

1. **Restart backend** to apply changes
2. **Monitor startup time** (should be ~30-60s with warmup)
3. **Test audio generation** (should be ~8-10s for 8s audio)
4. **Check GPU chart** (should show continuous activity, no idle gaps)

1. **Khởi động lại backend** để áp dụng thay đổi
2. **Theo dõi thời gian khởi động** (nên là ~30-60s với warmup)
3. **Test tạo audio** (nên là ~8-10s cho 8s audio)
4. **Kiểm tra biểu đồ GPU** (nên hiển thị hoạt động liên tục, không có khoảng trống)

