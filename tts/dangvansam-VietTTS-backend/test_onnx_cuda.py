"""
Test ONNX Runtime CUDA provider to identify the exact error
Kiểm tra ONNX Runtime CUDA provider để xác định lỗi chính xác
"""
import onnxruntime
import numpy as np
import torch

print("🔍 Testing ONNX Runtime CUDA Provider...")
print("🔍 Đang kiểm tra ONNX Runtime CUDA Provider...")
print()

# Check providers
print("Available providers:", onnxruntime.get_available_providers())
print()

# Try to create a dummy session with CUDA
# We need a real ONNX model file, but let's see what error we get
print("Testing CUDA provider initialization...")
print("Đang kiểm tra khởi tạo CUDA provider...")

# Check if we can at least import the CUDA provider
try:
    # Try to get provider info
    providers = onnxruntime.get_available_providers()
    print(f"✅ Providers available: {providers}")
    
    if "CUDAExecutionProvider" in providers:
        print("✅ CUDAExecutionProvider is in available providers")
        
        # Try to create a session (this will fail without a model, but we'll see the error)
        sess_opts = onnxruntime.SessionOptions()
        print("✅ SessionOptions created")
        
        # The actual error happens when creating InferenceSession with a model
        print("⚠️  To fully test, we need an actual ONNX model file")
        print("⚠️  Để kiểm tra đầy đủ, chúng ta cần file ONNX model thực tế")
        
except Exception as e:
    print(f"❌ Error: {e}")
    print(f"❌ Lỗi: {e}")
    import traceback
    traceback.print_exc()

print()
print("💡 The WinError 193 happens when ONNX Runtime tries to load CUDA DLLs")
print("💡 Lỗi WinError 193 xảy ra khi ONNX Runtime cố gắng tải DLL CUDA")
print("   This is usually a dependency issue (missing CUDA DLLs or wrong architecture)")
print("   Đây thường là vấn đề phụ thuộc (thiếu DLL CUDA hoặc kiến trúc sai)")

