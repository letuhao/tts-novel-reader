#!/usr/bin/env python
"""
Start VieNeu-TTS Backend Service Silently
Khởi động Dịch vụ VieNeu-TTS Backend Im lặng
"""
import subprocess
import sys
import os
import time
from pathlib import Path
import urllib.request
import urllib.error

# Get script directory
script_dir = Path(__file__).parent
os.chdir(script_dir)

# Check if backend is already running
def check_backend_running():
    """Check if backend is running on port 11111"""
    try:
        response = urllib.request.urlopen("http://127.0.0.1:11111/health", timeout=2)
        return response.status == 200
    except (urllib.error.URLError, OSError):
        return False

# Check if already running
if check_backend_running():
    print("⚠️  VieNeu-TTS Backend is already running on port 11111!")
    print("⚠️  VieNeu-TTS Backend đang chạy trên port 11111 rồi!")
    print("   Stop it first with: python stop_backend.py")
    sys.exit(1)

# Set log level
os.environ["TTS_LOG_LEVEL"] = "warning"

# Create logs directory
log_dir = script_dir / "logs"
log_dir.mkdir(exist_ok=True)

# Get Python path from venv
python_path = script_dir / ".venv" / "Scripts" / "python.exe"
if not python_path.exists():
    python_path = Path(sys.executable)

print("Starting VieNeu-TTS Backend in background...")
print("Đang khởi động VieNeu-TTS Backend ở chế độ nền...")

# Start process in background
output_log = log_dir / "backend_output.log"
error_log = log_dir / "backend_error.log"
pid_file = log_dir / "backend_pid.txt"

with open(output_log, "w") as out, open(error_log, "w") as err:
    process = subprocess.Popen(
        [str(python_path), "main.py"],
        cwd=str(script_dir),
        stdout=out,
        stderr=err,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    )

# Save process ID
with open(pid_file, "w") as f:
    f.write(str(process.pid))

# Wait a moment for it to start
time.sleep(5)

# Check if it's running
if check_backend_running():
    print("")
    print("✅ VieNeu-TTS Backend started successfully!")
    print("✅ VieNeu-TTS Backend đã được khởi động thành công!")
    print("")
    print("📡 Backend running at: http://127.0.0.1:11111")
    print("📚 API Docs: http://127.0.0.1:11111/docs")
    print("❤️  Health Check: http://127.0.0.1:11111/health")
    print("")
    print(f"📝 Logs: {log_dir}\\backend_*.log")
    print(f"🆔 Process ID: {process.pid}")
    print("")
    print("To stop: python stop_backend.py")
    print("Để dừng: python stop_backend.py")
else:
    print("")
    print("⚠️  Backend may still be starting...")
    print("⚠️  Backend có thể vẫn đang khởi động...")
    print(f"   Process ID: {process.pid}")
    print(f"   Check logs: {log_dir}\\backend_*.log")
    print("   Try: http://127.0.0.1:11111/docs in a few seconds")

