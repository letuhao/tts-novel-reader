#!/usr/bin/env python
"""
Start DangVanSam VietTTS Backend Service Silently
Khởi động Dịch vụ DangVanSam VietTTS Backend Im lặng
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
    print("⚠️  DangVanSam VietTTS Backend is already running on port 11111!")
    print("⚠️  DangVanSam VietTTS Backend đang chạy trên port 11111 rồi!")
    print("   Stop it first with: python stop_backend.py")
    sys.exit(1)

# Set log level
os.environ["TTS_LOG_LEVEL"] = "warning"

# Create logs directory
log_dir = script_dir / "logs"
log_dir.mkdir(exist_ok=True)

# CRITICAL: Always use venv Python - never use system Python
# QUAN TRỌNG: Luôn sử dụng Python từ venv - không bao giờ dùng Python hệ thống
python_path = script_dir / ".venv" / "Scripts" / "python.exe"
if not python_path.exists():
    print("❌ FATAL ERROR: Virtual environment not found!")
    print("❌ LỖI NGHIÊM TRỌNG: Không tìm thấy môi trường ảo!")
    print("")
    print(f"   Expected path: {python_path}")
    print(f"   Đường dẫn mong đợi: {python_path}")
    print("")
    print("   Please run setup first:")
    print("   Vui lòng chạy setup trước:")
    print("     .\\setup.ps1")
    print("   or / hoặc:")
    print("     python -m venv .venv")
    print("")
    sys.exit(1)

# Validate venv Python version (should be 3.10.x for compatibility)
# Xác thực phiên bản Python của venv (nên là 3.10.x để tương thích)
try:
    result = subprocess.run(
        [str(python_path), "--version"],
        capture_output=True,
        text=True,
        timeout=5
    )
    if result.returncode == 0:
        version_str = result.stdout.strip()
        print(f"✅ Using venv Python: {version_str}")
        print(f"✅ Đang sử dụng Python venv: {version_str}")
        # Check if it's Python 3.10.x (recommended for this backend)
        if "3.10" not in version_str and "3.11" not in version_str:
            print("⚠️  WARNING: This backend was tested with Python 3.10.x")
            print("⚠️  CẢNH BÁO: Backend này đã được kiểm tra với Python 3.10.x")
            print(f"   Current version: {version_str}")
            print(f"   Phiên bản hiện tại: {version_str}")
    else:
        print("⚠️  Could not verify Python version")
        print("⚠️  Không thể xác minh phiên bản Python")
except Exception as e:
    print(f"⚠️  Could not verify Python version: {e}")
    print(f"⚠️  Không thể xác minh phiên bản Python: {e}")

print("Starting DangVanSam VietTTS Backend in background...")
print("Đang khởi động DangVanSam VietTTS Backend ở chế độ nền...")

# Start process in background
output_log = log_dir / "backend_output.log"
error_log = log_dir / "backend_error.log"
pid_file = log_dir / "backend_pid.txt"

with open(output_log, "w", encoding="utf-8") as out, open(error_log, "w", encoding="utf-8") as err:
    process = subprocess.Popen(
        [str(python_path), "main.py"],
        cwd=str(script_dir),
        stdout=out,
        stderr=err,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    )

# Save process ID
with open(pid_file, "w", encoding="utf-8") as f:
    f.write(str(process.pid))

# Wait a moment for it to start
time.sleep(5)

# Check if it's running
if check_backend_running():
    print("")
    print("✅ DangVanSam VietTTS Backend started successfully!")
    print("✅ DangVanSam VietTTS Backend đã được khởi động thành công!")
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

