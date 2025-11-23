# Model Pool Implementation
# Triển khai Model Pool

## Summary / Tóm tắt

Đã triển khai Model Pool với 2 instances để hỗ trợ inference đồng thời, tránh crash khi có nhiều requests cùng lúc.

## Changes / Thay đổi

### 1. ModelPool Class / Class ModelPool

**File:** `tts/dangvansam-VietTTS-backend/tts_backend/service.py`

- Tạo class `ModelPool` để quản lý pool các model instances
- Lazy initialization: Pool chỉ khởi tạo khi có request đầu tiên (faster startup)
- Context manager pattern: Sử dụng `with pool.get_model() as model:` để đảm bảo model được trả về pool sau khi dùng xong
- Thread-safe queue để quản lý các model instances

**Features / Tính năng:**
- Pool size: 2 instances (configurable)
- Mỗi instance được warmup riêng khi khởi tạo
- Model được trả về pool tự động sau khi inference xong

### 2. TTSService Updates / Cập nhật TTSService

**File:** `tts/dangvansam-VietTTS-backend/tts_backend/service.py`

- Thêm `use_model_pool` flag (default: `True` for GPU, `False` for CPU)
- Thêm `model_pool_size` parameter (default: 2)
- `synthesize()` method sử dụng Model Pool nếu enabled
- Fallback về single instance với lock nếu pool disabled hoặc CPU mode

**Logic:**
```python
if self.use_model_pool and self.model_pool:
    # Use Model Pool for concurrent inference
    with self.model_pool.get_model() as viet_tts:
        return viet_tts.synthesize(...)
else:
    # Fallback: Single instance with lock
    with self._inference_lock:
        viet_tts = self.get_viet_tts()
        return viet_tts.synthesize(...)
```

### 3. Worker Configuration / Cấu hình Worker

**Files:** 
- `novel-app/backend/src/services/worker.js`
- `novel-app/backend/src/routes/worker.js`

**Changes / Thay đổi:**
- `parallelParagraphs`: `2` → `1` (default)
- `parallelChapters`: `2` (unchanged)
- **Total concurrent jobs:** `1 paragraph × 2 chapters = 2 jobs`

**Rationale / Lý do:**
- Phù hợp với Model Pool size (2 instances)
- Mỗi chapter xử lý 1 paragraph tại một thời điểm
- 2 chapters có thể chạy đồng thời, mỗi chapter dùng 1 model instance

## Testing / Kiểm thử

### Configuration / Cấu hình

**Model Pool:**
- Pool size: 2 instances
- Lazy initialization: Yes (on first request)
- Warmup: Yes (per instance)

**Worker:**
- Parallel chapters: 2
- Parallel paragraphs: 1
- Total concurrent jobs: 2

### Expected Behavior / Hành vi Dự kiến

1. **First Request / Request Đầu tiên:**
   - Model Pool khởi tạo (tải 2 instances)
   - Warmup cả 2 instances
   - Request được xử lý với instance đầu tiên

2. **Concurrent Requests / Requests Đồng thời:**
   - 2 requests có thể chạy đồng thời
   - Mỗi request lấy 1 instance từ pool
   - Không bị block hoặc crash

3. **After Inference / Sau Inference:**
   - Model được trả về pool tự động
   - Pool sẵn sàng cho requests tiếp theo

### GPU Usage / Sử dụng GPU

**Expected VRAM Usage / VRAM Dự kiến:**
- Single instance: ~7-10GB
- 2 instances: ~14-20GB
- RTX 4090 (24GB): Fits comfortably / Vừa vặn

**GPU Utilization / Sử dụng GPU:**
- 2 requests đồng thời → GPU utilization ~70-90%
- Better than sequential processing (~40-60%)

## Next Steps / Bước Tiếp theo

1. **Restart TTS Backend:**
   ```powershell
   cd tts\dangvansam-VietTTS-backend
   python stop_backend.py
   python start_backend.py
   ```

2. **Test with 2 Chapters:**
   - Generate 2 chapters concurrently
   - Monitor logs for Model Pool initialization
   - Check GPU usage and VRAM

3. **Monitor Performance:**
   - Check if concurrent requests work without crashes
   - Measure throughput improvement
   - Verify GPU utilization

## Rollback / Quay lại

Nếu có vấn đề, có thể rollback bằng cách:

1. **Disable Model Pool / Tắt Model Pool:**
   ```python
   # In service.py __init__
   use_model_pool=False  # Fallback to single instance with lock
   ```

2. **Or change pool size / Hoặc đổi pool size:**
   ```python
   model_pool_size=1  # Single instance (same as before)
   ```

## Notes / Ghi chú

- Model Pool chỉ khởi tạo khi có request đầu tiên (lazy loading)
- Startup time có thể chậm hơn khi khởi tạo pool (tải 2 models)
- Sau khi pool khởi tạo, performance sẽ tốt hơn cho concurrent requests
- Pool size có thể điều chỉnh dựa trên VRAM available

