# Multi-Window Startup - Mở nhiều Terminal Windows
## Cải thiện start_all_agents.py để mở terminal windows riêng cho mỗi service

**Date:** 2025-12-22  
**Status:** ✅ Implemented

---

## 🎯 Mục đích

Thay vì chạy tất cả services trong background (không thấy logs), mỗi service sẽ chạy trong terminal window riêng để:
- ✅ Dễ monitor logs real-time
- ✅ Dễ phát hiện service nào failed
- ✅ Xem error messages trực tiếp
- ✅ Debug dễ dàng hơn

---

## ✅ Changes Made

### 1. New Helper Function: `start_service_in_window()`

Thêm function mới để start service trong terminal window mới:

```python
def start_service_in_window(title, command, cwd, python_script=None):
    """
    Start a service in a new terminal window
    Mở service trong một terminal window mới
    """
    if sys.platform == "win32":
        if python_script:
            # Use Python script directly with CREATE_NEW_CONSOLE
            subprocess.Popen(
                ["python", python_script],
                cwd=cwd,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
                title=title
            )
        else:
            # Use cmd /k to keep window open and show output
            full_command = f'cmd /k "title {title} && {command}"'
            subprocess.Popen(
                full_command,
                shell=True,
                cwd=cwd,
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
```

**Key Points:**
- ✅ `subprocess.CREATE_NEW_CONSOLE` - Tạo console window mới
- ✅ `title` parameter - Set window title để dễ identify
- ✅ Support cả Python script và cmd command

### 2. Coqui TTS Backend

**Before:**
```python
subprocess.Popen(["python", "start_backend.py"], cwd=tts_backend_dir)
# Hidden window, logs to file
```

**After:**
```python
print("   📺 Opening TTS Backend in new terminal window...")
start_service_in_window(
    title="Coqui TTS Backend (Port 11111)",
    command="python start_backend.py",
    cwd=tts_backend_dir,
    python_script="start_backend.py"
)
```

**Benefits:**
- ✅ Terminal window với title rõ ràng
- ✅ Logs hiển thị real-time
- ✅ Dễ thấy nếu backend failed to start

### 3. Whisper STT Backend

**Before:**
```python
subprocess.Popen([
    "powershell", "-NoExit", "-Command",
    f"cd '{stt_dir}'; .\\start_backend.ps1"
])
```

**After:**
```python
print("   📺 Opening STT Backend in new PowerShell window...")
subprocess.Popen([
    "powershell", "-NoExit", "-Command",
    f"cd '{stt_dir}'; Write-Host '=== Whisper STT Backend (Port 11210) ===' -ForegroundColor Cyan; .\\start_backend.ps1"
], creationflags=subprocess.CREATE_NEW_CONSOLE)
```

**Changes:**
- ✅ Added `creationflags=subprocess.CREATE_NEW_CONSOLE`
- ✅ Added header message với port number
- ✅ `-NoExit` giữ window mở để xem logs

### 4. English Tutor Agent

**Before:**
```python
with open(log_dir / "agent_output.log", "w") as out, \
     open(log_dir / "agent_error.log", "w") as err:
    subprocess.Popen(
        [venv_python, "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "11300"],
        cwd=agent_dir,
        stdout=out,
        stderr=err,
        creationflags=subprocess.CREATE_NO_WINDOW  # Hidden!
    )
```

**After:**
```python
# Start uvicorn in new console window
cmd = f'cmd /k "title English Tutor Agent (Port 11300) && cd /d "{agent_dir}" && {venv_python} -m uvicorn src.main:app --host 0.0.0.0 --port 11300"'
subprocess.Popen(cmd, shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)
```

**Changes:**
- ✅ `CREATE_NEW_CONSOLE` thay vì `CREATE_NO_WINDOW`
- ✅ `cmd /k` giữ window mở
- ✅ Title rõ ràng với port number
- ✅ Logs hiển thị trực tiếp trong window

---

## 📋 Window Titles

Mỗi service có window title riêng:

1. **Coqui TTS Backend:** `"Coqui TTS Backend (Port 11111)"`
2. **Whisper STT Backend:** `"=== Whisper STT Backend (Port 11210) ==="`
3. **English Tutor Agent:** `"English Tutor Agent (Port 11300)"`

---

## 🎯 User Experience

### Before (Hidden Windows)
- ❌ Không thấy logs
- ❌ Phải check log files
- ❌ Khó debug khi service failed
- ❌ Không biết service nào đang chạy

### After (Visible Windows)
- ✅ Thấy logs real-time
- ✅ Dễ identify service từ window title
- ✅ Error messages hiển thị trực tiếp
- ✅ Dễ monitor và debug

---

## 🔍 Monitoring Workflow

1. **Run `start_all_agents.py`**
   - Script sẽ mở từng terminal window cho mỗi service
   - Mỗi window có title rõ ràng

2. **Monitor Windows**
   - Xem logs real-time trong mỗi window
   - Phát hiện errors ngay lập tức
   - Check health của từng service

3. **Identify Issues**
   - Nếu window đóng ngay → Service crashed
   - Nếu có error messages → Check logs trong window
   - Nếu service không start → Xem error trong window

---

## ✅ Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Visibility** | ❌ Hidden | ✅ Visible windows |
| **Logs** | ❌ Log files only | ✅ Real-time in window |
| **Debugging** | ❌ Hard | ✅ Easy |
| **Monitoring** | ❌ Check files | ✅ See directly |
| **Error Detection** | ❌ Delayed | ✅ Immediate |

---

## 🔧 Technical Details

### Windows: `subprocess.CREATE_NEW_CONSOLE`
- Tạo console window mới
- Mỗi process có console riêng
- Window hiển thị stdout/stderr

### PowerShell: `-NoExit`
- Giữ PowerShell window mở sau khi script chạy xong
- Cho phép xem output

### CMD: `cmd /k`
- `/k` giữ window mở
- Cho phép xem logs

---

## 📝 Example Output

Khi chạy `start_all_agents.py`, sẽ thấy:

```
=== Starting All Services ===

1. Starting PostgreSQL (Docker)...
   ✅ PostgreSQL started

2. Starting Coqui TTS Backend...
   📺 Opening TTS Backend in new terminal window...
   ⏳ Waiting for TTS backend to initialize...
   ✅ Coqui TTS Backend started successfully

3. Starting Whisper STT Backend...
   📺 Opening STT Backend in new PowerShell window...
   ✅ Whisper STT Backend started successfully

5. Starting English Tutor Agent...
   📺 Opening English Tutor Agent in new terminal window...
   ✅ English Tutor Agent started successfully
```

Và sẽ thấy **3 terminal windows** mở với:
- Coqui TTS Backend (Port 11111)
- Whisper STT Backend (Port 11210)  
- English Tutor Agent (Port 11300)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22  
**Status:** ✅ Implemented - Ready for testing

