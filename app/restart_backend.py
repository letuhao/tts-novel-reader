"""
Restart TTS Backend Service
Khởi động lại dịch vụ TTS Backend

Restarts the TTS backend by stopping existing processes and starting a new one.
Khởi động lại TTS backend bằng cách dừng các tiến trình hiện có và khởi động một tiến trình mới.
"""
import os
import sys
import time
import subprocess
import signal
from pathlib import Path

# Get script directory
SCRIPT_DIR = Path(__file__).parent.absolute()

def find_python_executable():
    """Find Python executable / Tìm thực thi Python"""
    # Try virtual environment first / Thử môi trường ảo trước
    venv_python = SCRIPT_DIR / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    
    # Try system Python / Thử Python hệ thống
    return sys.executable

def stop_backend():
    """Stop existing TTS backend processes / Dừng các tiến trình TTS backend hiện có"""
    print("=== Stopping TTS Backend ===")
    print("=== Đang dừng TTS Backend ===")
    print()
    
    try:
        # Find Python processes running main.py
        result = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq python.exe", "/FO", "CSV"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print("⚠️  Could not list processes")
            print("⚠️  Không thể liệt kê các tiến trình")
            return
        
        lines = result.stdout.strip().split('\n')
        stopped_count = 0
        
        for line in lines[1:]:  # Skip header
            if 'python.exe' not in line.lower():
                continue
            
            try:
                # Parse CSV
                parts = line.split(',')
                if len(parts) < 2:
                    continue
                
                pid = parts[1].strip('"')
                
                # Check command line
                cmd_result = subprocess.run(
                    ["wmic", "process", "where", f"ProcessId={pid}", "get", "CommandLine", "/format:list"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if cmd_result.returncode == 0 and 'main.py' in cmd_result.stdout:
                    print(f"Stopping process PID {pid}...")
                    print(f"Đang dừng tiến trình PID {pid}...")
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                        time.sleep(1)
                        # Force kill if still running
                        try:
                            os.kill(int(pid), 0)  # Check if process exists
                            os.kill(int(pid), signal.SIGTERM)
                            time.sleep(1)
                        except ProcessLookupError:
                            pass
                        stopped_count += 1
                        print(f"✅ Stopped PID {pid}")
                        print(f"✅ Đã dừng PID {pid}")
                    except (ProcessLookupError, PermissionError, ValueError) as e:
                        print(f"⚠️  Could not stop PID {pid}: {e}")
                        print(f"⚠️  Không thể dừng PID {pid}: {e}")
            except (ValueError, IndexError) as e:
                continue
        
        if stopped_count > 0:
            print(f"✅ Stopped {stopped_count} process(es)")
            print(f"✅ Đã dừng {stopped_count} tiến trình")
        else:
            print("ℹ️  No TTS backend processes found")
            print("ℹ️  Không tìm thấy tiến trình TTS backend")
        
        # Wait for processes to fully stop
        time.sleep(2)
        print()
        
    except subprocess.TimeoutExpired:
        print("⚠️  Process listing timed out")
        print("⚠️  Hết thời gian liệt kê tiến trình")
    except Exception as e:
        print(f"⚠️  Error stopping backend: {e}")
        print(f"⚠️  Lỗi khi dừng backend: {e}")

def start_backend():
    """Start TTS backend / Khởi động TTS backend"""
    print("=== Starting TTS Backend ===")
    print("=== Đang khởi động TTS Backend ===")
    print()
    
    # Find Python executable
    python_exe = find_python_executable()
    print(f"Using Python: {python_exe}")
    print(f"Sử dụng Python: {python_exe}")
    print()
    
    # Create logs directory
    logs_dir = SCRIPT_DIR / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Output files
    output_log = logs_dir / "backend_output.log"
    error_log = logs_dir / "backend_error.log"
    
    # Change to script directory
    os.chdir(SCRIPT_DIR)
    
    # Start backend
    print("Starting TTS backend...")
    print("Đang khởi động TTS backend...")
    print(f"Output log: {output_log}")
    print(f"Error log: {error_log}")
    print()
    
    try:
        # Open log files
        with open(output_log, 'a', encoding='utf-8') as out_file, \
             open(error_log, 'a', encoding='utf-8') as err_file:
            
            # Start process
            process = subprocess.Popen(
                [python_exe, "main.py"],
                cwd=str(SCRIPT_DIR),
                stdout=out_file,
                stderr=err_file,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )
            
            print(f"✅ TTS Backend started with PID {process.pid}")
            print(f"✅ TTS Backend đã được khởi động với PID {process.pid}")
            print()
            
            # Wait for backend to start
            print("Waiting for backend to initialize...")
            print("Đang chờ backend khởi tạo...")
            time.sleep(5)
            
            # Check if process is still running
            if process.poll() is None:
                print("✅ Backend process is running")
                print("✅ Tiến trình backend đang chạy")
            else:
                print("❌ Backend process exited immediately!")
                print("❌ Tiến trình backend đã thoát ngay lập tức!")
                print(f"Exit code: {process.returncode}")
                print()
                print("Check error log for details:")
                print("Kiểm tra error log để xem chi tiết:")
                if error_log.exists():
                    with open(error_log, 'r', encoding='utf-8') as f:
                        errors = f.read()
                        if errors.strip():
                            print(errors)
            
            return process.pid
            
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        print(f"❌ Lỗi khi khởi động backend: {e}")
        import traceback
        traceback.print_exc()
        return None

def check_backend_health(max_attempts=10):
    """Check if backend is responding / Kiểm tra xem backend có phản hồi không"""
    import urllib.request
    import urllib.error
    
    print("=== Checking Backend Health ===")
    print("=== Đang kiểm tra sức khỏe Backend ===")
    print()
    
    for i in range(1, max_attempts + 1):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=3) as response:
                if response.status == 200:
                    import json
                    data = json.loads(response.read().decode())
                    print("✅ Backend is RUNNING!")
                    print("✅ Backend đang CHẠY!")
                    print(f"   Status: {data.get('status', 'unknown')}")
                    print(f"   Service: {data.get('service', 'unknown')}")
                    return True
        except (urllib.error.URLError, ConnectionRefusedError, TimeoutError) as e:
            if i < max_attempts:
                print(f"[{i}/{max_attempts}] Waiting for backend to start...")
                print(f"[{i}/{max_attempts}] Đang chờ backend khởi động...")
                time.sleep(2)
            else:
                print(f"❌ Backend is not responding after {max_attempts * 2} seconds")
                print(f"❌ Backend không phản hồi sau {max_attempts * 2} giây")
                print(f"   Error: {e}")
                return False
    
    return False

def main():
    """Main function / Hàm chính"""
    print("=" * 50)
    print("TTS Backend Restart Script")
    print("Script khởi động lại TTS Backend")
    print("=" * 50)
    print()
    
    # Stop existing backend
    stop_backend()
    
    # Start new backend
    pid = start_backend()
    
    if pid:
        # Check health
        print()
        if check_backend_health():
            print()
            print("=" * 50)
            print("✅ TTS Backend restarted successfully!")
            print("✅ TTS Backend đã được khởi động lại thành công!")
            print("=" * 50)
        else:
            print()
            print("=" * 50)
            print("⚠️  Backend started but health check failed")
            print("⚠️  Backend đã khởi động nhưng kiểm tra sức khỏe thất bại")
            print("Check logs for errors:")
            print("Kiểm tra logs để xem lỗi:")
            print(f"  - {SCRIPT_DIR / 'logs' / 'backend_error.log'}")
            print("=" * 50)
    else:
        print()
        print("=" * 50)
        print("❌ Failed to start TTS Backend")
        print("❌ Không thể khởi động TTS Backend")
        print("=" * 50)
        sys.exit(1)

if __name__ == "__main__":
    main()

