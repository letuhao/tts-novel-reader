"""
Start All Services (English Tutor Agent + TTS + STT)
Khởi động Tất cả Services (English Tutor Agent + TTS + STT)

Pure Python script to avoid antivirus blocking
Each service opens in its own terminal window for easy monitoring
"""

import os
import sys
import subprocess
import time
import urllib.request
import urllib.error
from pathlib import Path

# Get root directory
root_dir = Path(__file__).parent.absolute()
os.chdir(root_dir)


def check_port(port: int) -> bool:
    """Check if port is in use"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result == 0


def check_health(url: str, timeout: int = 2) -> bool:
    """Check health endpoint"""
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except (urllib.error.URLError, OSError):
        return False


def run_command(cmd, cwd=None, check=True):
    """Run command and return result"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        if check and result.returncode != 0:
            print(f"   ⚠️  Command failed: {cmd}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print(f"   ⚠️  Command timeout: {cmd}")
        return False
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        return False


def start_cmd_window(title: str, cwd: Path, cmd_commands: str) -> None:
    """
    Open a new Windows cmd.exe window and keep it open (cmd /k).

    NOTE: On Windows, passing complex quoting to `cmd /k` can be brittle.
    Prefer `start_powershell_window()` for commands that include quotes and &&.
    """
    if sys.platform != "win32":
        subprocess.Popen(cmd_commands, shell=True, cwd=str(cwd))
        return
    # Use cmd's built-in `start` to reliably open a new window (works even when parent is PowerShell)
    subprocess.Popen(
        ["cmd", "/c", "start", title, "cmd", "/k", cmd_commands],
        cwd=str(cwd),
    )


def start_powershell_window(title: str, cwd: Path, ps_command: str) -> None:
    """Open a new PowerShell window and keep it open (-NoExit)."""
    if sys.platform != "win32":
        subprocess.Popen(ps_command, shell=True, cwd=str(cwd))
        return
    subprocess.Popen(
        ["cmd", "/c", "start", title, "powershell", "-NoExit", "-Command", ps_command],
        cwd=str(cwd),
    )


def start_service_in_window(title, command, cwd, python_script=None):
    """
    Backwards-compatible wrapper: start a service in a new window.
    - If python_script is provided, runs `python <script>` in new cmd window.
    - Otherwise runs `command` in new cmd window.
    """
    cwd = Path(cwd)
    if python_script:
        # Use PowerShell to avoid cmd quoting issues
        ps_cmd = f"cd '{cwd}'; Write-Host '=== {title} ===' -ForegroundColor Cyan; python {python_script}"
        start_powershell_window(title=title, cwd=cwd, ps_command=ps_cmd)
    else:
        ps_cmd = f"cd '{cwd}'; Write-Host '=== {title} ===' -ForegroundColor Cyan; {command}"
        start_powershell_window(title=title, cwd=cwd, ps_command=ps_cmd)


def open_log_viewer(service_name, log_file_path):
    """
    Open a terminal window to view logs of an already running service
    Mở terminal window để xem logs của service đã chạy
    """
    if sys.platform == "win32":
        log_file = Path(log_file_path)
        # Use PowerShell to tail the log file in a NEW window.
        # Create the file if it doesn't exist yet (so the viewer window still opens).
        ps_cmd = (
            f"Write-Host '=== {service_name} Logs ===' -ForegroundColor Cyan; "
            f"if (-not (Test-Path '{log_file}')) {{ New-Item -ItemType File -Path '{log_file}' -Force | Out-Null }}; "
            f"Get-Content '{log_file}' -Wait -Tail 50"
        )
        start_powershell_window(title=f"{service_name} Logs", cwd=log_file.parent, ps_command=ps_cmd)
        return True
    return False


print("=== Starting All Services ===")
print("=== Khởi động Tất cả Services ===")
print()
print("📺 Note: Each service will open in its own terminal window for monitoring")
print("📺 Lưu ý: Mỗi service sẽ mở trong terminal window riêng để theo dõi")
print()

# ==================== 1. Start PostgreSQL (Docker) ====================
print("1. Starting PostgreSQL (Docker)...")
print("   Đang khởi động PostgreSQL (Docker)...")
os.chdir(root_dir / "english-tutor-agent")

# Check if PostgreSQL is running
result = subprocess.run(
    "docker compose ps postgres --format json",
    shell=True,
    capture_output=True,
    text=True,
    cwd=root_dir / "english-tutor-agent"
)

postgres_running = False
if result.returncode == 0 and result.stdout.strip():
    try:
        import json
        containers = json.loads(result.stdout)
        if isinstance(containers, list) and len(containers) > 0:
            postgres_running = containers[0].get("State") == "running"
        elif isinstance(containers, dict):
            postgres_running = containers.get("State") == "running"
    except:
        pass

if postgres_running:
    print("   ✅ PostgreSQL is already running")
else:
    subprocess.run("docker compose up -d postgres", shell=True, cwd=root_dir / "english-tutor-agent")
    time.sleep(5)
    print("   ✅ PostgreSQL started")
print()

# ==================== 2. Start Coqui TTS Backend ====================
print("2. Starting Coqui TTS Backend...")
print("   Đang khởi động Coqui TTS Backend...")
os.chdir(root_dir / "tts" / "coqui-ai-tts-backend")

# Check if TTS backend is already running (use health check, not just port)
tts_already_running = check_health("http://127.0.0.1:11111/health")
if tts_already_running:
    print("   ✅ Coqui TTS Backend is already running (port 11111)")
    print("   📺 Opening log viewer window...")
    tts_backend_dir = root_dir / "tts" / "coqui-ai-tts-backend"
    open_log_viewer("Coqui TTS Backend (Port 11111)", tts_backend_dir / "logs" / "backend_output.log")
    time.sleep(1)
else:
    # Start in new terminal window
    # Note: start_backend.py runs in background (CREATE_NO_WINDOW), so we run main.py directly
    # to show logs in the terminal window
    tts_backend_dir = root_dir / "tts" / "coqui-ai-tts-backend"
    
    # Get Python path (prefer venv, fallback to system python)
    venv_python = tts_backend_dir / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        python_path = str(venv_python)
    else:
        python_path = sys.executable
    
    print("   📺 Opening TTS Backend in new terminal window...")
    # Use Windows `start` to reliably open a new window (matches how STT behaves)
    # Use PowerShell call operator (&) to run the python exe path safely
    ps_cmd = (
        f"cd '{tts_backend_dir}'; "
        "Write-Host '=== Coqui TTS Backend (Port 11111) ===' -ForegroundColor Cyan; "
        f"& '{python_path}' main.py"
    )
    start_powershell_window(
        title="Coqui TTS Backend (Port 11111)",
        cwd=tts_backend_dir,
        ps_command=ps_cmd,
    )
    time.sleep(3)
    
    # Wait longer for TTS backend to initialize (model loading takes time)
    print("   ⏳ Waiting for TTS backend to initialize (this may take 10-30 seconds)...")
    print("   ⏳ Đang chờ TTS backend khởi tạo (có thể mất 10-30 giây)...")
    print("   💡 Monitor progress in the TTS Backend terminal window")
    
    # Retry health check up to 6 times (30 seconds total)
    backend_started = False
    for i in range(6):
        time.sleep(5)
        if check_health("http://127.0.0.1:11111/health"):
            backend_started = True
            break
        print(f"   ⏳ Still waiting... ({i+1}/6)")
    
    if backend_started:
        print("   ✅ Coqui TTS Backend started successfully")
    else:
        print("   ⚠️  Coqui TTS Backend may not be running yet.")
        print("   ⚠️  Check the TTS Backend terminal window for errors")
        print("   ⚠️  Backend may still be loading models - wait a bit longer and check manually")
print()

# ==================== 3. Start Whisper STT Backend ====================
print("3. Starting Whisper STT Backend...")
print("   Đang khởi động Whisper STT Backend...")
os.chdir(root_dir / "stt")

stt_already_running = check_health("http://127.0.0.1:11210/health")
if stt_already_running:
    print("   ✅ Whisper STT Backend is already running (port 11210)")
    print("   💡 Service is running but no log viewer (service manages its own window)")
else:
    # STT needs cuDNN PATH, prefer PowerShell for this
    stt_dir = root_dir / "stt"
    if (stt_dir / "start_backend.ps1").exists():
        # Start in new PowerShell window so cuDNN PATH is properly set
        print("   📺 Opening STT Backend in new PowerShell window...")
        ps_cmd = (
            f"cd '{stt_dir}'; "
            "Write-Host '=== Whisper STT Backend (Port 11210) ===' -ForegroundColor Cyan; "
            ".\\start_backend.ps1"
        )
        start_powershell_window(
            title="Whisper STT Backend (Port 11210)",
            cwd=stt_dir,
            ps_command=ps_cmd,
        )
        time.sleep(3)
    elif (stt_dir / "start_backend.py").exists():
        print("   📺 Opening STT Backend in new terminal window...")
        start_service_in_window(
            title="Whisper STT Backend (Port 11210)",
            command="python start_backend.py",
            cwd=stt_dir,
            python_script="start_backend.py"
        )
        time.sleep(3)
    else:
        print("   ⚠️  No start script found in stt!")
    
    time.sleep(5)
    if check_health("http://127.0.0.1:11210/health"):
        print("   ✅ Whisper STT Backend started successfully")
    else:
        print("   ⚠️  Whisper STT Backend may not be running.")
        print("   💡 Check the STT Backend terminal window for errors")
print()

# ==================== 4. Check Ollama ====================
print("4. Checking Ollama...")
print("   Đang kiểm tra Ollama...")

if check_health("http://localhost:11434/api/tags"):
    print("   ✅ Ollama is running (port 11434)")
else:
    print("   ⚠️  Ollama is not running on port 11434")
    print("   ⚠️  Start Ollama manually: ollama serve")
print()

# ==================== 5. Start English Tutor Agent ====================
print("5. Starting English Tutor Agent...")
print("   Đang khởi động English Tutor Agent...")
os.chdir(root_dir / "english-tutor-agent")

agent_already_running = check_health("http://127.0.0.1:11300/health")
if agent_already_running:
    print("   ✅ English Tutor Agent is already running (port 11300)")
    print("   📺 Opening log viewer window...")
    agent_dir = root_dir / "english-tutor-agent"
    open_log_viewer("English Tutor Agent (Port 11300)", agent_dir / "logs" / "agent_output.log")
    time.sleep(1)
else:
    # Start in new terminal window
    # Note: start_agent.py runs in background (CREATE_NO_WINDOW), so we run uvicorn directly
    # to show logs in the terminal window
    agent_dir = root_dir / "english-tutor-agent"
    
    # Get Python path (prefer venv, fallback to system python)
    venv_python = agent_dir / "venv" / "Scripts" / "python.exe"
    if not venv_python.exists():
        venv_python = sys.executable
    else:
        venv_python = str(venv_python)
    
    print("   📺 Opening English Tutor Agent in new terminal window...")
    # Run uvicorn directly to see logs in window (instead of start_agent.py which runs in background)
    ps_cmd = (
        f"cd '{agent_dir}'; "
        "Write-Host '=== English Tutor Agent (Port 11300) ===' -ForegroundColor Cyan; "
        f"& '{venv_python}' -m uvicorn src.main:app --host 0.0.0.0 --port 11300"
    )
    start_powershell_window(
        title="English Tutor Agent (Port 11300)",
        cwd=agent_dir,
        ps_command=ps_cmd,
    )
    time.sleep(5)
    
    if check_health("http://127.0.0.1:11300/health"):
        print("   ✅ English Tutor Agent started successfully")
    else:
        print("   ⚠️  English Tutor Agent may not be running.")
        print("   💡 Check the English Tutor Agent terminal window for errors")
print()

# ==================== Check Status ====================
print("=== Checking Service Status ===")
print("=== Đang kiểm tra Trạng thái Services ===")
print()

# PostgreSQL
result = subprocess.run(
    "docker compose ps postgres --format json",
    shell=True,
    capture_output=True,
    text=True,
    cwd=root_dir / "english-tutor-agent"
)
postgres_status = False
if result.returncode == 0 and result.stdout.strip():
    try:
        import json
        containers = json.loads(result.stdout)
        if isinstance(containers, list) and len(containers) > 0:
            postgres_status = containers[0].get("State") == "running"
        elif isinstance(containers, dict):
            postgres_status = containers.get("State") == "running"
    except:
        pass

if postgres_status:
    print("✅ PostgreSQL (port 5433): Running")
else:
    print("❌ PostgreSQL (port 5433): Not running")

# Coqui TTS
if check_health("http://127.0.0.1:11111/health"):
    print("✅ Coqui TTS Backend (port 11111): Running")
    try:
        response = urllib.request.urlopen("http://127.0.0.1:11111/health", timeout=2)
        import json
        data = json.loads(response.read().decode())
        print(f"   Service: {data.get('service', 'N/A')}")
    except:
        pass
else:
    print("❌ Coqui TTS Backend (port 11111): Not responding")
    print("   💡 Start manually: cd tts\\coqui-ai-tts-backend && python start_backend.py")

# Whisper STT
if check_health("http://127.0.0.1:11210/health"):
    print("✅ Whisper STT Backend (port 11210): Running")
else:
    print("❌ Whisper STT Backend (port 11210): Not responding")

# Ollama
if check_health("http://localhost:11434/api/tags"):
    print("✅ Ollama (port 11434): Running")
else:
    print("⚠️  Ollama (port 11434): Not running (start manually: ollama serve)")

# English Tutor Agent
if check_health("http://127.0.0.1:11300/health"):
    print("✅ English Tutor Agent (port 11300): Running")
    try:
        response = urllib.request.urlopen("http://127.0.0.1:11300/health", timeout=2)
        import json
        data = json.loads(response.read().decode())
        print(f"   Checkpointer: {data.get('checkpointer', 'N/A')}")
    except:
        pass
else:
    print("❌ English Tutor Agent (port 11300): Not responding")

print()
print("=== All Services Started! ===")
print("=== Tất cả Services đã được Khởi động! ===")
print()
print("📋 Service URLs:")
print("  - PostgreSQL: localhost:5433")
print("  - Coqui TTS Backend: http://127.0.0.1:11111")
print("  - Whisper STT Backend: http://127.0.0.1:11210")
print("  - Ollama: http://localhost:11434")
print("  - English Tutor Agent: http://127.0.0.1:11300")
print("  - Agent API Docs: http://127.0.0.1:11300/docs")
print()
print("📺 Monitor each service in its terminal window")
print("📺 Theo dõi mỗi service trong terminal window của nó")
