"""
Stop English Tutor Agent Service
Dừng Dịch vụ English Tutor Agent
"""

import os
import sys
import psutil
from pathlib import Path

# Get script directory
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)

print("Stopping English Tutor Agent...")
print("Đang dừng English Tutor Agent...")

# Try to get process from PID file
log_dir = script_dir / "logs"
pid_file = log_dir / "agent_pid.txt"

if pid_file.exists():
    try:
        with open(pid_file, "r") as f:
            pid = int(f.read().strip())
        
        try:
            process = psutil.Process(pid)
            process.terminate()
            process.wait(timeout=5)
            print(f"✅ Stopped agent process {pid}")
            print(f"✅ Đã dừng agent process {pid}")
            pid_file.unlink()
        except psutil.NoSuchProcess:
            print(f"⚠️  Process {pid} not found or already stopped")
            pid_file.unlink()
        except psutil.TimeoutExpired:
            process.kill()
            print(f"✅ Force killed agent process {pid}")
    except (ValueError, FileNotFoundError):
        pass

# Also try to stop by port
try:
    for conn in psutil.net_connections(kind='inet'):
        if conn.laddr.port == 11300 and conn.status == 'LISTEN':
            try:
                process = psutil.Process(conn.pid)
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ Stopped process on port 11300: {conn.pid}")
                print(f"✅ Đã dừng process trên port 11300: {conn.pid}")
            except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                if 'process' in locals():
                    process.kill()
                    print(f"✅ Force killed process: {conn.pid}")
except Exception as e:
    print(f"⚠️  Could not stop process: {e}")

print()

