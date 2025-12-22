"""
Stop All Services (English Tutor Agent + TTS + STT)
Dừng Tất cả Services (English Tutor Agent + TTS + STT)

Pure Python script to avoid antivirus blocking
"""

import os
import sys
import subprocess
import time
import psutil
from pathlib import Path

# Get root directory
root_dir = Path(__file__).parent.absolute()
os.chdir(root_dir)


def stop_process_on_port(port: int):
    """Stop process running on port"""
    try:
        for conn in psutil.net_connections(kind='inet'):
            if conn.laddr.port == port and conn.status == 'LISTEN':
                try:
                    process = psutil.Process(conn.pid)
                    process.terminate()
                    process.wait(timeout=5)
                    print(f"   ✅ Stopped process on port {port}: {conn.pid}")
                    return True
                except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                    if 'process' in locals():
                        try:
                            process.kill()
                            print(f"   ✅ Force killed process: {conn.pid}")
                        except:
                            pass
                    return False
    except Exception as e:
        print(f"   ⚠️  Error stopping process on port {port}: {e}")
    return False


def stop_by_pid_file(pid_file: Path):
    """Stop process using PID file"""
    if not pid_file.exists():
        return False
    
    try:
        with open(pid_file, "r") as f:
            pid = int(f.read().strip())
        
        try:
            process = psutil.Process(pid)
            process.terminate()
            process.wait(timeout=5)
            print(f"   ✅ Stopped process {pid}")
            pid_file.unlink()
            return True
        except psutil.NoSuchProcess:
            print(f"   ℹ️  Process {pid} not found")
            pid_file.unlink()
            return False
        except psutil.TimeoutExpired:
            process.kill()
            print(f"   ✅ Force killed process {pid}")
            pid_file.unlink()
            return True
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
    return False


print("=== Stopping All Services ===")
print("=== Dừng Tất cả Services ===")
print()

# ==================== 1. Stop English Tutor Agent ====================
print("1. Stopping English Tutor Agent...")
agent_dir = root_dir / "english-tutor-agent"
pid_file = agent_dir / "logs" / "agent_pid.txt"

if pid_file.exists():
    stop_by_pid_file(pid_file)
else:
    stop_process_on_port(11300)

time.sleep(2)
print()

# ==================== 2. Stop Coqui TTS Backend ====================
print("2. Stopping Coqui TTS Backend...")
tts_dir = root_dir / "tts" / "coqui-ai-tts-backend"

# Try Python stop script first
if (tts_dir / "stop_backend.py").exists():
    subprocess.run(["python", "stop_backend.py"], cwd=tts_dir, timeout=10)
elif (tts_dir / "stop_backend.ps1").exists():
    subprocess.run(["powershell", "-File", "stop_backend.ps1"], cwd=tts_dir, timeout=10)
else:
    stop_process_on_port(11111)

time.sleep(2)
print()

# ==================== 3. Stop Whisper STT Backend ====================
print("3. Stopping Whisper STT Backend...")
stop_process_on_port(11210)
time.sleep(2)
print()

# ==================== 4. PostgreSQL ====================
print("4. PostgreSQL Docker container...")
print("   ℹ️  PostgreSQL container left running (use 'docker compose down' to stop)")
print()

print("=== All Services Stopped! ===")
print("=== Tất cả Services đã được Dừng! ===")
print()
print("Note: PostgreSQL container is still running.")
print("To stop it: cd english-tutor-agent && docker compose down")
print()

