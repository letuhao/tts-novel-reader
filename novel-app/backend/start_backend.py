"""
Start Novel Reader Backend Silently
Khởi động Novel Reader Backend Ở Chế độ Nền
"""
import subprocess
import sys
import os
import time
from pathlib import Path

# Try to import requests, install if missing
try:
    import requests
except ImportError:
    print("⚠️  requests not found. Installing...")
    print("⚠️  Không tìm thấy requests. Đang cài đặt...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests>=2.28.0"])
    import requests

# Try to import psutil (optional, only for checking existing process)
try:
    import psutil
except ImportError:
    psutil = None

SCRIPT_DIR = Path(__file__).parent
LOGS_DIR = SCRIPT_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

PID_FILE = LOGS_DIR / "backend_pid.txt"
OUTPUT_LOG = LOGS_DIR / "backend_output.log"
ERROR_LOG = LOGS_DIR / "backend_error.log"
PORT = int(os.getenv("PORT", "11110"))

def is_port_in_use(port):
    """Check if port is in use / Kiểm tra port có đang được sử dụng"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_backend():
    """Start the backend in background / Khởi động backend ở chế độ nền"""
    
    # Check if backend is already running
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            
            if psutil and psutil.pid_exists(pid):
                try:
                    process = psutil.Process(pid)
                    if "node" in process.name().lower():
                        print(f"⚠️  Backend is already running (PID: {pid})")
                        print(f"⚠️  Backend đã đang chạy (PID: {pid})")
                        return
                except Exception:
                    pass
        except Exception:
            pass
    
    # Check if port is in use
    if is_port_in_use(PORT):
        print(f"⚠️  Port {PORT} is already in use. Backend might be running.")
        print(f"⚠️  Port {PORT} đã được sử dụng. Backend có thể đang chạy.")
        return
    
    print("Starting Novel Reader Backend in background...")
    print("Đang khởi động Novel Reader Backend ở chế độ nền...")
    
    # Check if node is available
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ Error: Node.js not found. Please install Node.js 18+")
            sys.exit(1)
    except FileNotFoundError:
        print("❌ Error: Node.js not found. Please install Node.js 18+")
        sys.exit(1)
    
    # Start backend process
    env = os.environ.copy()
    env["NODE_ENV"] = "production"
    
    # Preserve TTS_DEFAULT_MODEL if set (for vieneu-tts-backend)
    # Giữ nguyên TTS_DEFAULT_MODEL nếu đã được thiết lập (cho vieneu-tts-backend)
    if "TTS_DEFAULT_MODEL" in os.environ:
        env["TTS_DEFAULT_MODEL"] = os.environ["TTS_DEFAULT_MODEL"]
        print(f"   📝 Using TTS_DEFAULT_MODEL={os.environ['TTS_DEFAULT_MODEL']}")
        print(f"   📝 Đang sử dụng TTS_DEFAULT_MODEL={os.environ['TTS_DEFAULT_MODEL']}")
    
    with open(OUTPUT_LOG, "w", encoding="utf-8") as outfile, \
         open(ERROR_LOG, "w", encoding="utf-8") as errfile:
        process = subprocess.Popen(
            ["node", "src/server.js"],
            cwd=str(SCRIPT_DIR),
            stdout=outfile,
            stderr=errfile,
            env=env,
            creationflags=subprocess.CREATE_NO_WINDOW  # Hide window on Windows
        )
    
    # Save PID
    with open(PID_FILE, "w") as f:
        f.write(str(process.pid))
    
    # Wait a moment for server to start
    print(f"   Waiting for server to start... / Đợi server khởi động...")
    time.sleep(3)
    
    # Check if server is responding
    max_retries = 10
    for i in range(max_retries):
        try:
            response = requests.get(f"http://127.0.0.1:{PORT}/health", timeout=2)
            if response.status_code == 200:
                print(f"\n✅ Novel Reader Backend started successfully!")
                print(f"✅ Novel Reader Backend đã được khởi động thành công!")
                print(f"\n📡 Backend running at: http://127.0.0.1:{PORT}")
                print(f"📚 API: http://127.0.0.1:{PORT}/api")
                print(f"❤️  Health Check: http://127.0.0.1:{PORT}/health")
                print(f"\n📝 Logs: {LOGS_DIR}/backend_*.log")
                print(f"🆔 Process ID: {process.pid}")
                print(f"\nTo stop: python stop_backend.py")
                print(f"Để dừng: python stop_backend.py")
                return
        except Exception:
            if i < max_retries - 1:
                time.sleep(1)
            else:
                print(f"\n⚠️  Backend process started (PID: {process.pid}) but health check failed.")
                print(f"⚠️  Backend process đã khởi động (PID: {process.pid}) nhưng kiểm tra sức khỏe thất bại.")
                print(f"📝 Check logs: {ERROR_LOG}")
                print(f"📝 Kiểm tra logs: {ERROR_LOG}")

if __name__ == "__main__":
    start_backend()

