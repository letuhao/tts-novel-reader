# Running Novel Reader Backend / Chạy Novel Reader Backend

## 🚀 Python Scripts (No Console Blocking!) / Scripts Python (Không Chặn Console!)

### Start Backend / Khởi động Backend

```powershell
cd D:\Works\source\novel-reader\novel-app\backend
python start_backend.py
```

The backend will run silently in the background!  
Backend sẽ chạy im lặng ở chế độ nền!

### Stop Backend / Dừng Backend

```powershell
python stop_backend.py
```

## ✅ Features / Tính năng

1. **No Console Blocking** - Runs in background / Không chặn console - Chạy ở nền
2. **Silent Operation** - Output redirected to logs / Hoạt động im lặng - Output chuyển vào logs
3. **Auto-detection** - Checks if backend is already running / Tự phát hiện - Kiểm tra backend đã chạy chưa
4. **Log Management** - Logs saved to `logs/backend_*.log` / Quản lý log - Logs lưu vào `logs/backend_*.log`
5. **Process Tracking** - PID saved for easy stopping / Theo dõi process - PID được lưu để dễ dừng

## 📝 Usage / Sử dụng

### 1. Start Backend / Khởi động Backend

```powershell
python start_backend.py
```

**Output:**
- ✅ Backend started successfully
- 📡 URL: http://127.0.0.1:11110
- 📚 API: http://127.0.0.1:11110/api
- 🆔 Process ID saved

### 2. Check Logs / Kiểm tra Logs

```powershell
# Output log / Log đầu ra
Get-Content logs\backend_output.log

# Error log / Log lỗi
Get-Content logs\backend_error.log
```

### 3. Stop Backend / Dừng Backend

```powershell
python stop_backend.py
```

## 🔧 Troubleshooting / Xử lý Sự cố

### Backend won't start / Backend không khởi động

1. Check if port 11110 is already in use:
   ```powershell
   netstat -ano | findstr :11110
   ```

2. Stop existing backend:
   ```powershell
   python stop_backend.py
   ```

3. Check logs:
   ```powershell
   Get-Content logs\backend_error.log
   ```

### Node.js not found / Không tìm thấy Node.js

Make sure Node.js 18+ is installed and in PATH:
```powershell
node --version
```

### TTS Backend Connection / Kết nối TTS Backend

Make sure TTS backend is running on port 11111:
```powershell
curl http://127.0.0.1:11111/health
```

If not running, start it:
```powershell
cd D:\Works\source\novel-reader\app
python start_backend.py
```

## 📊 Log Files / File Log

- `logs/backend_output.log` - Standard output / Đầu ra chuẩn
- `logs/backend_error.log` - Error output / Đầu ra lỗi
- `logs/backend_pid.txt` - Process ID / ID Process

---

**Backend runs silently in the background!**  
**Backend chạy im lặng ở chế độ nền!**

