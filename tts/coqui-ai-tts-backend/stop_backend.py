#!/usr/bin/env python
"""
Stop Coqui TTS Backend Service
Dừng Dịch vụ Coqui TTS Backend
"""
import os
import sys
from pathlib import Path

# Get script directory
script_dir = Path(__file__).parent
pid_file = script_dir / "logs" / "backend_pid.txt"

if not pid_file.exists():
    print("⚠️  Backend PID file not found. Backend may not be running.")
    print("⚠️  Không tìm thấy file PID backend. Backend có thể không đang chạy.")
    sys.exit(1)

# Read PID
with open(pid_file, "r") as f:
    pid = int(f.read().strip())

# Try to kill process
try:
    if sys.platform == "win32":
        os.system(f"taskkill /F /PID {pid}")
    else:
        os.kill(pid, 15)  # SIGTERM
    print(f"✅ Backend stopped (PID: {pid})")
    print(f"✅ Backend đã dừng (PID: {pid})")
except Exception as e:
    print(f"⚠️  Failed to stop backend: {e}")
    print(f"⚠️  Không thể dừng backend: {e}")

# Remove PID file
try:
    pid_file.unlink()
except Exception:
    pass

