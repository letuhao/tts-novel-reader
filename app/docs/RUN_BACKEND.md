# Running TTS Backend / Chạy TTS Backend

## 🚀 Python Scripts (No Antivirus Issues!) / Scripts Python (Không có Vấn đề Antivirus!)

### Start Backend / Khởi động Backend

```powershell
cd D:\Works\source\novel-reader\app
python start_backend.py
```

### Stop Backend / Dừng Backend

```powershell
python stop_backend.py
```

### Test Dia TTS / Kiểm tra Dia TTS

```powershell
python test_dia.py
```

## ✅ Features / Tính năng

1. **No PowerShell scripts** - Pure Python, no antivirus issues
2. **Background process** - Runs silently in background
3. **Auto-detection** - Checks if backend is already running
4. **Log management** - Logs saved to `logs/backend_*.log`
5. **Process tracking** - PID saved for easy stopping

## 📝 Usage / Sử dụng

### 1. Start Backend / Khởi động Backend

```powershell
python start_backend.py
```

**Output:**
- ✅ Backend started successfully
- 📡 URL: http://127.0.0.1:8000
- 📚 Docs: http://127.0.0.1:8000/docs
- 🆔 Process ID saved

### 2. Test API / Kiểm tra API

```powershell
python test_dia.py
```

**Tests:**
1. Health check
2. Model info
3. Speech generation

**Output:**
- `dia_test_output.wav` - Generated audio file

### 3. Stop Backend / Dừng Backend

```powershell
python stop_backend.py
```

## 📊 Logs / Nhật ký

Logs are saved to `logs/` directory:
- `backend_output.log` - Standard output
- `backend_error.log` - Error output
- `backend_pid.txt` - Process ID

## 🔧 Troubleshooting / Xử lý Sự cố

### Backend won't start / Backend không khởi động

1. Check if port 8000 is already in use:
   ```powershell
   netstat -ano | findstr :8000
   ```

2. Stop existing backend:
   ```powershell
   python stop_backend.py
   ```

3. Check logs:
   ```powershell
   Get-Content logs\backend_error.log
   ```

### Model loading timeout / Timeout tải model

Dia TTS model is large (6.4GB), so loading takes time:
- First load: ~30-60 seconds
- Subsequent loads: Faster (cached)

Increase timeout in `test_dia.py` if needed.

## 💡 Tips / Mẹo

1. **First run:** Model loading takes time - be patient!
2. **Check logs:** If issues occur, check `logs/backend_error.log`
3. **API Docs:** Visit http://127.0.0.1:8000/docs for interactive testing
4. **Test script:** `test_dia.py` shows how to use the API

---

**Use Python scripts instead of PowerShell - no antivirus issues!**  
**Sử dụng scripts Python thay vì PowerShell - không có vấn đề antivirus!**

