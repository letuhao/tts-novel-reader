"""
Stop Novel Reader Backend
Dừng Novel Reader Backend
"""
import os
import signal
import socket
import sys
from pathlib import Path

# Try to import psutil, install if missing
try:
    import psutil
except ImportError:
    print("⚠️  psutil not found. Installing...")
    print("⚠️  Không tìm thấy psutil. Đang cài đặt...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil>=5.9.0"])
    import psutil

SCRIPT_DIR = Path(__file__).parent
LOGS_DIR = SCRIPT_DIR / "logs"
PID_FILE = LOGS_DIR / "backend_pid.txt"
PORT = int(os.getenv("PORT", "11110"))

def stop_backend():
    """Stop the backend / Dừng backend"""
    print("Stopping Novel Reader Backend...")
    print("Đang dừng Novel Reader Backend...")
    
    stopped = False
    
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            
            if psutil.pid_exists(pid):
                process = psutil.Process(pid)
                process_name = process.name().lower()
                
                if "node" in process_name:
                    try:
                        process.terminate()  # Graceful termination
                        process.wait(timeout=5)  # Wait for process to terminate
                        if process.is_running():
                            process.kill()  # Force kill if still running
                        print(f"   ✅ Stopped process {pid}")
                        stopped = True
                    except psutil.TimeoutExpired:
                        process.kill()
                        print(f"   ✅ Force killed process {pid}")
                        stopped = True
                    except Exception as e:
                        print(f"   ❌ Error stopping process {pid}: {e}")
                else:
                    print(f"   ℹ️  Process {pid} is not Node.js (it's {process_name})")
            
            PID_FILE.unlink()  # Delete PID file
            print("✅ Novel Reader Backend stopped")
            print("✅ Novel Reader Backend đã được dừng")
            return
            
        except Exception as e:
            print(f"   ❌ Error reading PID file: {e}")
    
    # Try to find process by port
    if not stopped:
        print("   ℹ️  No PID file found. Checking for processes on port {}...".format(PORT))
        
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                process = psutil.Process(proc.info['pid'])
                process_name = proc.info['name'].lower()
                
                # Check if it's a Node.js process
                if 'node' in process_name:
                    try:
                        # Check connections
                        connections = process.net_connections()
                        for conn in connections:
                            if conn.status == psutil.CONN_LISTEN and conn.laddr.port == PORT:
                                pid = proc.info['pid']
                                try:
                                    process.terminate()
                                    process.wait(timeout=5)
                                    if process.is_running():
                                        process.kill()
                                    print(f"   ✅ Stopped process {pid} on port {PORT}")
                                    stopped = True
                                    break
                                except Exception as e:
                                    print(f"   ❌ Error stopping process {pid}: {e}")
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        pass
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        if stopped:
            print("✅ Novel Reader Backend stopped")
            print("✅ Novel Reader Backend đã được dừng")
        else:
            print("   ℹ️  No backend process found running on port {}".format(PORT))
            print("   ℹ️  Không tìm thấy process backend trên port {}".format(PORT))

if __name__ == "__main__":
    stop_backend()

