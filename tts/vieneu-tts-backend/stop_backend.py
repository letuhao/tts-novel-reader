#!/usr/bin/env python
"""
Stop VieNeu-TTS Backend Service
Dừng Dịch vụ VieNeu-TTS Backend
"""
import subprocess
import sys
import os
from pathlib import Path
import urllib.request
import urllib.error

# Get script directory
script_dir = Path(__file__).parent
log_dir = script_dir / "logs"
pid_file = log_dir / "backend_pid.txt"

print("Stopping VieNeu-TTS Backend...")
print("Đang dừng VieNeu-TTS Backend...")

processes_to_stop = []

# Method 1: Find by PID file
if pid_file.exists():
    try:
        with open(pid_file, "r") as f:
            pid = int(f.read().strip())
        processes_to_stop.append(pid)
    except (ValueError, FileNotFoundError):
        pass

# Method 2: Find process using port 11111 (Windows)
if sys.platform == "win32":
    try:
        # Use netstat to find process using port 11111
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True
        )
        for line in result.stdout.splitlines():
            if ":11111" in line and "LISTENING" in line:
                parts = line.split()
                if len(parts) > 0:
                    try:
                        pid = int(parts[-1])
                        processes_to_stop.append(pid)
                    except ValueError:
                        pass
    except Exception:
        pass

# Remove duplicates
processes_to_stop = list(set(processes_to_stop))

if processes_to_stop:
    stopped = False
    for pid in processes_to_stop:
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], 
                             capture_output=True)
            else:
                os.kill(pid, 15)
            print(f"   ✅ Stopped process {pid}")
            stopped = True
        except (ProcessLookupError, PermissionError, subprocess.SubprocessError):
            pass
    
    if stopped:
        # Clean up PID file
        if pid_file.exists():
            pid_file.unlink()
        
        print("")
        print("✅ VieNeu-TTS Backend stopped")
        print("✅ VieNeu-TTS Backend đã được dừng")
    else:
        print("   ❌ Could not stop processes")
else:
    # Final check if backend is actually running
    try:
        urllib.request.urlopen("http://127.0.0.1:11111/health", timeout=2)
        print("   ⚠️  Backend appears to be running but couldn't find process ID")
        print("   ⚠️  Backend có vẻ đang chạy nhưng không tìm thấy process ID")
        print("   Try killing Python processes manually")
    except (urllib.error.URLError, OSError):
        print("   ℹ️  No VieNeu-TTS Backend process found on port 11111")
        print("   ℹ️  Không tìm thấy process VieNeu-TTS Backend trên port 11111")

