#!/usr/bin/env python
"""
Check Virtual Environment Isolation
Kiểm tra Cô lập Môi trường Ảo

This script verifies that the virtual environment is properly isolated
and using the correct Python version.
Script này xác minh rằng môi trường ảo được cô lập đúng cách
và sử dụng phiên bản Python chính xác.
"""
import sys
import subprocess
from pathlib import Path

def check_venv():
    """Check if venv exists and is properly configured"""
    script_dir = Path(__file__).parent
    venv_python = script_dir / ".venv" / "Scripts" / "python.exe"
    
    print("=" * 60)
    print("Checking Virtual Environment Isolation")
    print("Kiểm tra Cô lập Môi trường Ảo")
    print("=" * 60)
    print()
    
    # Check 1: Venv exists
    print("1. Checking if .venv exists...")
    print("   1. Kiểm tra xem .venv có tồn tại không...")
    if not venv_python.exists():
        print("   ❌ FAILED: .venv not found!")
        print("   ❌ THẤT BẠI: Không tìm thấy .venv!")
        print(f"      Expected: {venv_python}")
        print(f"      Mong đợi: {venv_python}")
        return False
    print("   ✅ PASSED: .venv exists")
    print("   ✅ ĐÃ QUA: .venv tồn tại")
    print()
    
    # Check 2: Python version in venv
    print("2. Checking Python version in venv...")
    print("   2. Kiểm tra phiên bản Python trong venv...")
    try:
        result = subprocess.run(
            [str(venv_python), "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        venv_version = result.stdout.strip()
        print(f"   ✅ Venv Python: {venv_version}")
        print(f"   ✅ Python venv: {venv_version}")
        
        # Check if it's Python 3.10.x (recommended)
        if "3.10" in venv_version:
            print("   ✅ Version is correct (3.10.x recommended)")
            print("   ✅ Phiên bản đúng (3.10.x được khuyến nghị)")
        elif "3.11" in venv_version:
            print("   ⚠️  Version is 3.11.x (3.10.x recommended)")
            print("   ⚠️  Phiên bản là 3.11.x (3.10.x được khuyến nghị)")
        else:
            print("   ⚠️  Version may not be compatible (3.10.x recommended)")
            print("   ⚠️  Phiên bản có thể không tương thích (3.10.x được khuyến nghị)")
    except Exception as e:
        print(f"   ❌ FAILED: Could not check Python version: {e}")
        print(f"   ❌ THẤT BẠI: Không thể kiểm tra phiên bản Python: {e}")
        return False
    print()
    
    # Check 3: System Python vs Venv Python
    print("3. Comparing system Python vs venv Python...")
    print("   3. So sánh Python hệ thống với Python venv...")
    system_python = sys.executable
    print(f"   System Python: {system_python}")
    print(f"   Python hệ thống: {system_python}")
    print(f"   Venv Python: {venv_python}")
    print(f"   Python venv: {venv_python}")
    
    if str(venv_python).lower() == system_python.lower():
        print("   ⚠️  WARNING: Using system Python (venv not activated!)")
        print("   ⚠️  CẢNH BÁO: Đang sử dụng Python hệ thống (venv chưa được kích hoạt!)")
        return False
    else:
        print("   ✅ PASSED: Venv Python is different from system Python")
        print("   ✅ ĐÃ QUA: Python venv khác với Python hệ thống")
    print()
    
    # Check 4: Key packages in venv
    print("4. Checking key packages in venv...")
    print("   4. Kiểm tra các gói quan trọng trong venv...")
    packages_to_check = ["torch", "onnxruntime", "fastapi", "uvicorn"]
    all_ok = True
    for package in packages_to_check:
        try:
            result = subprocess.run(
                [str(venv_python), "-c", f"import {package}; print({package}.__version__)"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                print(f"   ✅ {package}: {version}")
            else:
                print(f"   ❌ {package}: NOT INSTALLED")
                print(f"   ❌ {package}: CHƯA ĐƯỢC CÀI ĐẶT")
                all_ok = False
        except Exception as e:
            print(f"   ❌ {package}: ERROR - {e}")
            all_ok = False
    
    if not all_ok:
        print()
        print("   ⚠️  Some packages are missing. Run setup:")
        print("   ⚠️  Một số gói bị thiếu. Chạy setup:")
        print("      .\\setup.ps1")
        return False
    print()
    
    # Check 5: sys.path isolation
    print("5. Checking sys.path isolation...")
    print("   5. Kiểm tra cô lập sys.path...")
    try:
        result = subprocess.run(
            [str(venv_python), "-c", "import sys; print('\\n'.join(sys.path[:3]))"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            paths = result.stdout.strip().split('\n')
            venv_path = str(script_dir / ".venv")
            if any(venv_path.lower() in p.lower() for p in paths):
                print("   ✅ PASSED: sys.path includes venv paths")
                print("   ✅ ĐÃ QUA: sys.path bao gồm đường dẫn venv")
            else:
                print("   ⚠️  WARNING: sys.path may not include venv")
                print("   ⚠️  CẢNH BÁO: sys.path có thể không bao gồm venv")
        else:
            print("   ⚠️  Could not check sys.path")
            print("   ⚠️  Không thể kiểm tra sys.path")
    except Exception as e:
        print(f"   ⚠️  Error checking sys.path: {e}")
        print(f"   ⚠️  Lỗi khi kiểm tra sys.path: {e}")
    print()
    
    print("=" * 60)
    print("✅ Environment check completed!")
    print("✅ Kiểm tra môi trường hoàn tất!")
    print("=" * 60)
    print()
    print("To start the backend, use:")
    print("Để khởi động backend, sử dụng:")
    print("  .\\start_backend.ps1")
    print("  or / hoặc:")
    print("  python start_backend.py")
    print()
    print("IMPORTANT: Always use the start scripts, not 'python main.py' directly!")
    print("QUAN TRỌNG: Luôn sử dụng script khởi động, không chạy 'python main.py' trực tiếp!")
    print()
    
    return True

if __name__ == "__main__":
    success = check_venv()
    sys.exit(0 if success else 1)

