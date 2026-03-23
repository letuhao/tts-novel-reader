"""
Check All Services Status
Kiểm tra Trạng thái Tất cả Services
"""

import os
import sys
import socket
import urllib.request
import urllib.error
import json
import subprocess
from pathlib import Path

# Get root directory
root_dir = Path(__file__).parent.absolute()
os.chdir(root_dir)


def check_port(port: int, host: str = '127.0.0.1') -> bool:
    """Check if port is listening"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex((host, port))
    sock.close()
    return result == 0


def check_health(url: str, timeout: int = 3) -> tuple[bool, dict]:
    """Check health endpoint and return status and data"""
    try:
        response = urllib.request.urlopen(url, timeout=timeout)
        data = json.loads(response.read().decode()) if response.headers.get_content_type() == 'application/json' else {}
        return True, {"status_code": response.status, "data": data}
    except urllib.error.URLError as e:
        return False, {"error": str(e)}
    except Exception as e:
        return False, {"error": str(e)}


def check_postgres():
    """Check PostgreSQL Docker container"""
    print("1. PostgreSQL (Docker)...")
    try:
        result = subprocess.run(
            "docker compose ps postgres --format json",
            shell=True,
            capture_output=True,
            text=True,
            cwd=root_dir / "english-tutor-agent",
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            containers = json.loads(result.stdout)
            if isinstance(containers, list) and len(containers) > 0:
                state = containers[0].get("State", "unknown")
            elif isinstance(containers, dict):
                state = containers.get("State", "unknown")
            else:
                state = "unknown"
            
            if state == "running":
                print("   ✅ Running (port 5433)")
                return True
            else:
                print(f"   ❌ Not running (State: {state})")
                return False
        else:
            print("   ❌ Not found")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def check_coqui_tts():
    """Check Coqui TTS Backend"""
    print("2. Coqui TTS Backend...")
    if not check_port(11111):
        print("   ❌ Port 11111 not listening")
        return False
    
    status, info = check_health("http://127.0.0.1:11111/health")
    if status:
        print(f"   ✅ Running (port 11111, Status: {info['status_code']})")
        return True
    else:
        print(f"   ❌ Health check failed: {info.get('error', 'Unknown error')}")
        return False


def check_whisper_stt():
    """Check Whisper STT Backend"""
    print("3. Whisper STT Backend...")
    if not check_port(11210):
        print("   ❌ Port 11210 not listening")
        return False
    
    status, info = check_health("http://127.0.0.1:11210/health")
    if status:
        print(f"   ✅ Running (port 11210, Status: {info['status_code']})")
        return True
    else:
        print(f"   ❌ Health check failed: {info.get('error', 'Unknown error')}")
        return False


def check_ollama():
    """Check Ollama"""
    print("4. Ollama...")
    if not check_port(11434):
        print("   ⚠️  Port 11434 not listening (may need to start manually: ollama serve)")
        return False
    
    status, info = check_health("http://localhost:11434/api/tags")
    if status:
        print("   ✅ Running (port 11434)")
        return True
    else:
        print("   ⚠️  Not responding (may need to start manually: ollama serve)")
        return False


def check_agent():
    """Check English Tutor Agent"""
    print("5. English Tutor Agent...")
    if not check_port(11300):
        print("   ❌ Port 11300 not listening")
        return False
    
    status, info = check_health("http://127.0.0.1:11300/health")
    if status:
        data = info.get('data', {})
        print(f"   ✅ Running (port 11300, Status: {info['status_code']})")
        print(f"      Service: {data.get('service', 'N/A')}")
        print(f"      Version: {data.get('version', 'N/A')}")
        print(f"      Checkpointer: {data.get('checkpointer', 'N/A')}")
        return True
    else:
        print(f"   ❌ Health check failed: {info.get('error', 'Unknown error')}")
        return False


def main():
    print("=" * 60)
    print("Service Status Check")
    print("Kiểm tra Trạng thái Services")
    print("=" * 60)
    print()
    
    results = {
        "PostgreSQL": check_postgres(),
    }
    print()
    
    results["Coqui TTS"] = check_coqui_tts()
    print()
    
    results["Whisper STT"] = check_whisper_stt()
    print()
    
    results["Ollama"] = check_ollama()
    print()
    
    results["English Tutor Agent"] = check_agent()
    print()
    
    # Summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    total = len(results)
    running = sum(1 for v in results.values() if v)
    
    for service, status in results.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {service}")
    
    print()
    print(f"Running: {running}/{total}")
    
    if running == total:
        print("✅ All services are running!")
    elif running == total - 1 and not results.get("Ollama"):
        print("⚠️  All required services running (Ollama optional)")
    else:
        print("❌ Some services are not running")
    
    print()
    print("Service URLs:")
    print("  - PostgreSQL: localhost:5433")
    print("  - Coqui TTS: http://127.0.0.1:11111")
    print("  - Whisper STT: http://127.0.0.1:11210")
    print("  - Ollama: http://localhost:11434")
    print("  - English Tutor Agent: http://127.0.0.1:11300")
    print("  - Agent API Docs: http://127.0.0.1:11300/docs")
    print()


if __name__ == "__main__":
    main()

