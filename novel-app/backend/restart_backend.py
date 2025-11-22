"""
Restart Novel Backend Service
Khởi động lại dịch vụ Novel Backend

Restarts the novel backend by stopping existing processes and starting a new one.
Khởi động lại novel backend bằng cách dừng các tiến trình hiện có và khởi động một tiến trình mới.
"""
import os
import sys
import time
import subprocess
import signal
from pathlib import Path

# Get script directory
SCRIPT_DIR = Path(__file__).parent.absolute()

def find_node_executable():
    """Find Node.js executable / Tìm thực thi Node.js"""
    # Try node from PATH
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, timeout=5)
        if result.returncode == 0:
            return 'node'
    except:
        pass
    
    # Try npm run (which uses node)
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, timeout=5)
        if result.returncode == 0:
            return 'npm'
    except:
        pass
    
    return None

def stop_backend():
    """Stop existing novel backend processes / Dừng các tiến trình novel backend hiện có"""
    print("=== Stopping Novel Backend ===")
    print("=== Đang dừng Novel Backend ===")
    print()
    
    try:
        # Find Node.js processes running server.js
        result = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq node.exe", "/FO", "CSV"],
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
            if 'node.exe' not in line.lower():
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
                
                if cmd_result.returncode == 0:
                    cmd_line = cmd_result.stdout
                    if 'server.js' in cmd_line or 'src/server.js' in cmd_line or ':11110' in cmd_line:
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
            print("ℹ️  No novel backend processes found")
            print("ℹ️  Không tìm thấy tiến trình novel backend")
        
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
    """Start novel backend / Khởi động novel backend"""
    print("=== Starting Novel Backend ===")
    print("=== Đang khởi động Novel Backend ===")
    print()
    
    # Find Node executable
    node_exe = find_node_executable()
    if not node_exe:
        print("❌ Node.js not found!")
        print("❌ Không tìm thấy Node.js!")
        print("   Please install Node.js first")
        print("   Vui lòng cài đặt Node.js trước")
        return None
    
    print(f"Using Node: {node_exe}")
    print(f"Sử dụng Node: {node_exe}")
    print()
    
    # Create logs directory
    logs_dir = SCRIPT_DIR / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Output files
    output_log = logs_dir / "backend_output.log"
    error_log = logs_dir / "backend_error.log"
    
    # Change to script directory
    os.chdir(SCRIPT_DIR)
    
    # Check if node_modules exists
    if not (SCRIPT_DIR / "node_modules").exists():
        print("⚠️  node_modules not found. Installing dependencies...")
        print("⚠️  Không tìm thấy node_modules. Đang cài đặt dependencies...")
        print()
        try:
            install_result = subprocess.run(
                [node_exe if node_exe == 'npm' else 'npm', 'install'],
                cwd=str(SCRIPT_DIR),
                timeout=300,
                capture_output=True,
                text=True
            )
            if install_result.returncode != 0:
                print(f"❌ Failed to install dependencies: {install_result.stderr}")
                print(f"❌ Thất bại khi cài đặt dependencies: {install_result.stderr}")
                return None
            print("✅ Dependencies installed")
            print("✅ Đã cài đặt dependencies")
            print()
        except Exception as e:
            print(f"❌ Error installing dependencies: {e}")
            print(f"❌ Lỗi khi cài đặt dependencies: {e}")
            return None
    
    # Start backend
    print("Starting novel backend...")
    print("Đang khởi động novel backend...")
    print(f"Output log: {output_log}")
    print(f"Error log: {error_log}")
    print()
    
    try:
        # Open log files
        with open(output_log, 'a', encoding='utf-8') as out_file, \
             open(error_log, 'a', encoding='utf-8') as err_file:
            
            # Start process using npm start
            if node_exe == 'npm':
                process = subprocess.Popen(
                    ['npm', 'start'],
                    cwd=str(SCRIPT_DIR),
                    stdout=out_file,
                    stderr=err_file,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
                )
            else:
                # Direct node execution
                server_js = SCRIPT_DIR / "src" / "server.js"
                if not server_js.exists():
                    print(f"❌ Server file not found: {server_js}")
                    print(f"❌ Không tìm thấy file server: {server_js}")
                    return None
                
                process = subprocess.Popen(
                    ['node', str(server_js)],
                    cwd=str(SCRIPT_DIR),
                    stdout=out_file,
                    stderr=err_file,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
                )
            
            print(f"✅ Novel Backend started with PID {process.pid}")
            print(f"✅ Novel Backend đã được khởi động với PID {process.pid}")
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
                            print(errors[-1000:])  # Last 1000 chars
            
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
            with urllib.request.urlopen("http://127.0.0.1:11110/health", timeout=3) as response:
                if response.status == 200:
                    import json
                    data = json.loads(response.read().decode())
                    print("✅ Backend is RUNNING!")
                    print("✅ Backend đang CHẠY!")
                    print(f"   Status: {data.get('status', 'unknown')}")
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
    print("=" * 60)
    print("Novel Backend Restart Script")
    print("Script khởi động lại Novel Backend")
    print("=" * 60)
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
            print("=" * 60)
            print("✅ Novel Backend restarted successfully!")
            print("✅ Novel Backend đã được khởi động lại thành công!")
            print("=" * 60)
        else:
            print()
            print("=" * 60)
            print("⚠️  Backend started but health check failed")
            print("⚠️  Backend đã khởi động nhưng kiểm tra sức khỏe thất bại")
            print("Check logs for errors:")
            print("Kiểm tra logs để xem lỗi:")
            print(f"  - {SCRIPT_DIR / 'logs' / 'backend_error.log'}")
            print("=" * 60)
    else:
        print()
        print("=" * 60)
        print("❌ Failed to start Novel Backend")
        print("❌ Không thể khởi động Novel Backend")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()

