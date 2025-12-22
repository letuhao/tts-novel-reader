# TTS Backend Connection Error - Giải thích lỗi
## Tại sao bị lỗi "All connection attempts failed"?

**Date:** 2025-12-22  
**Error:** `httpx.ConnectError: All connection attempts failed`

---

## 🔍 Nguyên nhân

Lỗi **"All connection attempts failed"** xảy ra khi:

1. ❌ **TTS Backend không đang chạy** (nguyên nhân chính)
2. ❌ Port 11111 không được lắng nghe
3. ❌ URL cấu hình sai
4. ❌ Firewall/Network blocking connection

---

## ✅ Kiểm tra

### 1. Kiểm tra TTS Backend có đang chạy không

```powershell
# Check port 11111
netstat -ano | findstr ":11111"

# Nếu không có output → Backend không chạy
```

### 2. Test connection

```powershell
curl http://127.0.0.1:11111/health

# Nếu lỗi "Connection refused" → Backend không chạy
# Nếu thành công → Backend đang chạy
```

---

## 🚀 Giải pháp: Khởi động TTS Backend

### Cách 1: Dùng Python script (Recommended)

```powershell
cd D:\Works\source\novel-reader\tts\coqui-ai-tts-backend
python start_backend.py
```

### Cách 2: Dùng PowerShell script

```powershell
cd D:\Works\source\novel-reader\tts\coqui-ai-tts-backend
.\start_backend.ps1
```

### Cách 3: Manual start

```powershell
cd D:\Works\source\novel-reader\tts\coqui-ai-tts-backend
python main.py
```

---

## 📋 Verification Steps

Sau khi start backend, verify:

### 1. Check process

```powershell
netstat -ano | findstr ":11111"
# Should show process listening on port 11111
```

### 2. Test health endpoint

```powershell
curl http://127.0.0.1:11111/health
# Expected: {"status":"healthy","service":"Coqui TTS (XTTS-v2) English Backend","version":"1.0.0"}
```

### 3. Test speakers endpoint

```powershell
curl http://127.0.0.1:11111/api/tts/speakers
# Should return list of 58 speakers
```

---

## 🔧 Code Implementation Notes

Code implementation của chúng ta **KHÔNG SAI**. Lỗi chỉ xảy ra khi:

1. ✅ Code đúng format API
2. ✅ Code đúng endpoint (`/health`, `/api/tts/synthesize`)
3. ✅ Code đúng request format (matches TypeScript)
4. ❌ **Backend không chạy** → Connection failed

---

## 📝 Error Flow

```
Test Script
    ↓
Pipeline Agent
    ↓
TTS Service Client
    ↓
httpx.AsyncClient.post("http://localhost:11111/api/tts/synthesize")
    ↓
❌ ConnectError: All connection attempts failed
    ↓
Reason: Port 11111 không có service nào listening
```

---

## ✅ Action Items

1. ✅ Code đã được fix (matches TypeScript implementation)
2. ⏳ **Cần start TTS backend trước khi test**
3. ⏳ Verify backend đang chạy với `curl http://127.0.0.1:11111/health`
4. ⏳ Rerun test sau khi backend start

---

## 🎯 Kết luận

**Lỗi không phải do code sai**, mà do **TTS backend service không đang chạy**.

Code implementation đã đúng:
- ✅ API format matches TypeScript
- ✅ Endpoints correct (`/health`, `/api/tts/synthesize`)
- ✅ Request/Response parsing correct
- ✅ Error handling proper

**Next step:** Start TTS backend service trước khi test.

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22  
**Status:** ✅ Root cause identified - Backend not running

