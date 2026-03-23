"""
Start English Tutor Agent Service
Khởi động Dịch vụ English Tutor Agent
"""

import os
import sys
import subprocess
import time
import urllib.request
import urllib.error
from pathlib import Path

# Get script directory
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)


def check_agent_running():
    """Check if agent is already running"""
    try:
        urllib.request.urlopen("http://127.0.0.1:11300/health", timeout=2)
        return True
    except (urllib.error.URLError, OSError):
        return False


# Check if already running
if check_agent_running():
    print("⚠️  Agent is already running on port 11300!")
    print("⚠️  Agent đang chạy trên port 11300 rồi!")
    print("   Stop it first with: python stop_agent.py")
    sys.exit(1)

# Create log directory
log_dir = script_dir / "logs"
log_dir.mkdir(exist_ok=True)

# Get Python path
venv_path = script_dir / "venv" / "Scripts" / "python.exe"
if venv_path.exists():
    python_path = str(venv_path)
else:
    python_path = sys.executable

print("Starting English Tutor Agent in background...")
print("Đang khởi động English Tutor Agent ở chế độ nền...")

# Start process in background
output_log = log_dir / "agent_output.log"
error_log = log_dir / "agent_error.log"
pid_file = log_dir / "agent_pid.txt"

with open(output_log, "w") as out, open(error_log, "w") as err:
    process = subprocess.Popen(
        [python_path, "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "11300"],
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
if check_agent_running():
    print("✅ Agent started successfully!")
    print("✅ Agent đã được khởi động thành công!")
    print(f"   Process ID: {process.pid}")
    print("   URL: http://127.0.0.1:11300")
    print("   API Docs: http://127.0.0.1:11300/docs")
    print("   Health: http://127.0.0.1:11300/health")
    print(f"   Logs: {log_dir}")
else:
    print("⚠️  Agent started but health check failed. Check logs:", log_dir)
    print("⚠️  Agent đã khởi động nhưng health check thất bại. Kiểm tra logs:", log_dir)

print()

