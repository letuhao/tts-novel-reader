# Running TTS Backend Silently / Chạy TTS Backend Im lặng

## 🚀 Quick Start / Bắt đầu Nhanh

### Start Backend Silently / Khởi động Backend Im lặng

```powershell
cd D:\Works\source\novel-reader\app
.\start_backend.ps1
```

### Stop Backend / Dừng Backend

```powershell
.\stop_backend.ps1
```

## 📝 Methods / Phương pháp

### Method 1: PowerShell Script (Recommended) / Phương pháp 1: Script PowerShell (Được khuyến nghị)

**Start:**
```powershell
.\start_backend.ps1
```

**Stop:**
```powershell
.\stop_backend.ps1
```

This runs the backend as a background job with minimal output.  
Điều này chạy backend như một background job với đầu ra tối thiểu.

### Method 2: Direct Background Process / Phương pháp 2: Process Nền Trực tiếp

```powershell
cd D:\Works\source\novel-reader\app
$env:Path = "C:\Users\NeneScarlet\.local\bin;$env:Path"
.\.venv\Scripts\Activate.ps1

# Run in background with no window
Start-Process python -ArgumentList "main.py" -WindowStyle Hidden
```

### Method 3: Environment Variable (Silent Mode) / Phương pháp 3: Biến Môi trường (Chế độ Im lặng)

```powershell
cd D:\Works\source\novel-reader\app
$env:Path = "C:\Users\NeneScarlet\.local\bin;$env:Path"
.\.venv\Scripts\Activate.ps1

# Set log level to warning (less output)
$env:TTS_LOG_LEVEL = "warning"
python main.py
```

## 🔧 Configuration / Cấu hình

### Log Levels / Mức Log

Set `TTS_LOG_LEVEL` environment variable:
- `debug` - Most verbose
- `info` - Normal
- `warning` - Minimal (default for silent mode)
- `error` - Only errors
- `critical` - Critical only

```powershell
$env:TTS_LOG_LEVEL = "warning"
python main.py
```

### Disable Access Logs / Tắt Access Logs

Access logs are disabled by default when running `main.py` directly.  
Access logs được tắt theo mặc định khi chạy `main.py` trực tiếp.

## ✅ Verify Backend is Running / Kiểm tra Backend Đang Chạy

### Check Health / Kiểm tra Sức khỏe

```powershell
curl http://127.0.0.1:8000/health
```

### Open API Docs / Mở API Docs

Visit: **http://127.0.0.1:8000/docs**

### Check Process / Kiểm tra Process

```powershell
Get-Process python | Where-Object { $_.CommandLine -like "*main.py*" }
```

## 🛑 Stop Backend / Dừng Backend

### Method 1: Stop Script / Phương pháp 1: Script Dừng

```powershell
.\stop_backend.ps1
```

### Method 2: Find and Kill Process / Phương pháp 2: Tìm và Kill Process

```powershell
# Find process
$proc = Get-Process python | Where-Object { $_.CommandLine -like "*main.py*" }

# Kill it
Stop-Process -Id $proc.Id -Force
```

### Method 3: Kill by Port / Phương pháp 3: Kill theo Port

```powershell
# Find process using port 8000
$proc = Get-NetTCPConnection -LocalPort 8000 | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id $proc -Force
```

## 📊 Check Status / Kiểm tra Trạng thái

```powershell
# Health check
curl http://127.0.0.1:8000/health

# Check if process exists
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*main.py*" }
```

## 💡 Tips / Mẹo

1. **Background Job:** Use `start_backend.ps1` for easiest management
2. **Minimal Logs:** Set `TTS_LOG_LEVEL=warning` for less output
3. **Auto-restart:** Consider using a service manager for production
4. **Check Logs:** Even in silent mode, check process output if issues occur

---

**Use `start_backend.ps1` for easiest silent operation!**  
**Sử dụng `start_backend.ps1` để vận hành im lặng dễ nhất!**

