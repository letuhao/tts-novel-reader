"""
Fix ONNX Runtime CUDA Provider
Sửa ONNX Runtime CUDA Provider

This script checks and fixes ONNX Runtime CUDA setup.
Script này kiểm tra và sửa setup ONNX Runtime CUDA.
"""
import sys
import subprocess

def check_onnx_installation():
    """Check current ONNX Runtime installation / Kiểm tra cài đặt ONNX Runtime hiện tại"""
    print("=" * 60)
    print("Checking ONNX Runtime installation...")
    print("Đang kiểm tra cài đặt ONNX Runtime...")
    print("=" * 60)
    
    try:
        import onnxruntime as ort
        print(f"✅ ONNX Runtime version: {ort.__version__}")
        print(f"✅ Phiên bản ONNX Runtime: {ort.__version__}")
        
        providers = ort.get_available_providers()
        print(f"\nAvailable providers / Providers có sẵn:")
        for i, provider in enumerate(providers, 1):
            marker = "✅" if provider == "CUDAExecutionProvider" else "❌"
            print(f"  {i}. {marker} {provider}")
        
        if "CUDAExecutionProvider" in providers:
            print("\n✅ CUDAExecutionProvider is available!")
            print("✅ CUDAExecutionProvider có sẵn!")
            return True
        else:
            print("\n❌ CUDAExecutionProvider is NOT available!")
            print("❌ CUDAExecutionProvider KHÔNG có sẵn!")
            print("\nPossible reasons / Lý do có thể:")
            print("  1. onnxruntime-gpu is not installed")
            print("  2. CPU-only version (onnxruntime) is installed instead")
            print("  3. CUDA DLLs are not accessible")
            print("\n  Có thể:")
            print("  1. onnxruntime-gpu chưa được cài đặt")
            print("  2. Phiên bản chỉ CPU (onnxruntime) đã được cài đặt")
            print("  3. CUDA DLLs không thể truy cập được")
            return False
            
    except ImportError:
        print("❌ ONNX Runtime is not installed!")
        print("❌ ONNX Runtime chưa được cài đặt!")
        return False

def check_installed_packages():
    """Check what ONNX packages are installed / Kiểm tra packages ONNX nào đã được cài đặt"""
    print("\n" + "=" * 60)
    print("Checking installed packages...")
    print("Đang kiểm tra packages đã cài đặt...")
    print("=" * 60)
    
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "list"],
            capture_output=True,
            text=True,
            check=True
        )
        
        lines = result.stdout.split('\n')
        onnx_lines = [line for line in lines if 'onnxruntime' in line.lower()]
        
        if onnx_lines:
            print("\nFound ONNX Runtime packages / Tìm thấy packages ONNX Runtime:")
            for line in onnx_lines:
                print(f"  - {line}")
        else:
            print("\n❌ No ONNX Runtime packages found!")
            print("❌ Không tìm thấy packages ONNX Runtime!")
            
        return onnx_lines
    except Exception as e:
        print(f"❌ Error checking packages: {e}")
        print(f"❌ Lỗi kiểm tra packages: {e}")
        return []

def fix_installation():
    """Fix ONNX Runtime installation / Sửa cài đặt ONNX Runtime"""
    print("\n" + "=" * 60)
    print("Attempting to fix ONNX Runtime installation...")
    print("Đang thử sửa cài đặt ONNX Runtime...")
    print("=" * 60)
    
    print("\nStep 1: Uninstalling CPU-only version...")
    print("Bước 1: Gỡ cài đặt phiên bản chỉ CPU...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "uninstall", "onnxruntime", "-y"],
            check=True
        )
        print("✅ Uninstalled onnxruntime (CPU-only)")
        print("✅ Đã gỡ cài đặt onnxruntime (chỉ CPU)")
    except Exception as e:
        print(f"⚠️  Could not uninstall onnxruntime: {e}")
        print(f"⚠️  Không thể gỡ cài đặt onnxruntime: {e}")
    
    print("\nStep 2: Installing onnxruntime-gpu...")
    print("Bước 2: Đang cài đặt onnxruntime-gpu...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "onnxruntime-gpu"],
            check=True
        )
        print("✅ Installed onnxruntime-gpu")
        print("✅ Đã cài đặt onnxruntime-gpu")
    except Exception as e:
        print(f"❌ Could not install onnxruntime-gpu: {e}")
        print(f"❌ Không thể cài đặt onnxruntime-gpu: {e}")
        return False
    
    print("\nStep 3: Verifying installation...")
    print("Bước 3: Đang xác minh cài đặt...")
    return check_onnx_installation()

if __name__ == "__main__":
    print("=" * 60)
    print("ONNX Runtime CUDA Fix Script")
    print("Script Sửa ONNX Runtime CUDA")
    print("=" * 60)
    
    # Check current status
    has_cuda = check_onnx_installation()
    packages = check_installed_packages()
    
    if not has_cuda:
        print("\n" + "=" * 60)
        print("ONNX Runtime CUDA is not available. Attempting to fix...")
        print("ONNX Runtime CUDA không khả dụng. Đang thử sửa...")
        print("=" * 60)
        
        response = input("\nDo you want to fix the installation? (y/n): ")
        if response.lower() in ['y', 'yes']:
            fixed = fix_installation()
            if fixed:
                print("\n✅ ONNX Runtime CUDA is now available!")
                print("✅ ONNX Runtime CUDA bây giờ đã khả dụng!")
                print("\nPlease restart the backend to apply changes.")
                print("Vui lòng khởi động lại backend để áp dụng thay đổi.")
            else:
                print("\n❌ Could not fix ONNX Runtime CUDA automatically.")
                print("❌ Không thể sửa ONNX Runtime CUDA tự động.")
                print("\nPlease fix manually:")
                print("Vui lòng sửa thủ công:")
                print("  1. pip uninstall onnxruntime")
                print("  2. pip install onnxruntime-gpu")
        else:
            print("\nSkipping fix.")
            print("Bỏ qua sửa chữa.")
    else:
        print("\n✅ ONNX Runtime CUDA is already available!")
        print("✅ ONNX Runtime CUDA đã có sẵn!")

