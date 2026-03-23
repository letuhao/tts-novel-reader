# Deprecation Warnings Fixed
# Đã Sửa Cảnh Báo Deprecation

## ✅ Warnings Fixed / Cảnh Báo Đã Sửa

### 1. FastAPI `on_event` Deprecation

**Warning:**
```
DeprecationWarning: on_event is deprecated, use lifespan event handlers instead.
```

**Fixed:** Changed from `@app.on_event("startup")` to `lifespan` context manager.

**Đã sửa:** Đổi từ `@app.on_event("startup")` sang `lifespan` context manager.

### 2. Coqui TTS `gpu` Parameter Deprecation

**Warning:**
```
UserWarning: `gpu` will be deprecated. Please use `tts.to(device)` instead.
```

**Fixed:** Changed from `gpu=(self.device == "cuda")` parameter to `tts.to("cuda")` after initialization.

**Đã sửa:** Đổi từ tham số `gpu=(self.device == "cuda")` sang `tts.to("cuda")` sau khi khởi tạo.

---

## 📝 Changes Made / Thay Đổi Đã Thực Hiện

### File: `main.py`

**Before / Trước:**
```python
@app.on_event("startup")
async def startup_event():
    service = get_service()
    ...
```

**After / Sau:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    service = get_service()
    ...
    yield
    # Shutdown
    storage.shutdown()

app = FastAPI(..., lifespan=lifespan)
```

### File: `tts_backend/models/xtts_english.py`

**Before / Trước:**
```python
self.tts = TTS(
    model_path=str(model_path_obj),
    config_path=str(config_path),
    gpu=(self.device == "cuda"),  # ❌ Deprecated
    progress_bar=True
)
```

**After / Sau:**
```python
self.tts = TTS(
    model_path=str(model_path_obj),
    config_path=str(config_path),
    progress_bar=True
)
# Move to device after initialization (new API)
if self.device == "cuda":
    self.tts.to("cuda")  # ✅ New API
```

---

## ✅ Benefits / Lợi ích

1. **No Deprecation Warnings** - Clean startup logs
2. **Future-Proof** - Uses current FastAPI and Coqui TTS APIs
3. **Better Lifecycle Management** - Proper startup/shutdown handling
4. **Cleaner Code** - More explicit device management

1. **Không Cảnh Báo Deprecation** - Log khởi động sạch
2. **Tương Lai** - Sử dụng API FastAPI và Coqui TTS hiện tại
3. **Quản Lý Vòng Đời Tốt Hơn** - Xử lý khởi động/tắt đúng cách
4. **Mã Sạch Hơn** - Quản lý thiết bị rõ ràng hơn

---

## 🧪 Testing / Kiểm tra

Run the backend and verify no warnings:

```powershell
.\run.ps1
```

**Expected output (no warnings):**
```
🚀 Starting Coqui TTS (XTTS-v2) Backend...
Starting Coqui TTS (XTTS-v2) Backend...
✅ TTS Backend ready with default model: xtts-english
```

**No deprecation warnings should appear!** ✅

---

**Fixed:** 2024-12-19
**Status:** ✅ All warnings resolved

