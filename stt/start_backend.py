"""
Start STT Backend Service
Script to start the STT backend service
"""
import subprocess
import sys
import os
from pathlib import Path

# Get script directory
script_dir = Path(__file__).parent
os.chdir(script_dir)

# Configure cuDNN for faster-whisper (CTranslate2 needs cuDNN DLLs)
cudnn_paths = [
    Path(r"C:\Program Files\NVIDIA\CUDNN\v9.16\bin"),
    Path(r"C:\Program Files\NVIDIA\CUDNN\v8.9.7.29\bin"),
]

for cudnn_bin in cudnn_paths:
    if cudnn_bin.exists():
        cudnn_str = str(cudnn_bin)
        current_path = os.environ.get("PATH", "")
        if cudnn_str not in current_path:
            os.environ["PATH"] = f"{cudnn_str};{current_path}"
            print(f"✅ Added cuDNN to PATH: {cudnn_str}")
        else:
            print(f"ℹ️  cuDNN already in PATH: {cudnn_str}")
        break
else:
    print("⚠️  cuDNN not found. GPU acceleration may not work.")
    print("   Expected locations:")
    for path in cudnn_paths:
        print(f"   - {path}")

# Run uvicorn
subprocess.run([
    sys.executable, "-m", "uvicorn",
    "main:app",
    "--host", "0.0.0.0",
    "--port", "11210",
    "--log-level", "info",
])

