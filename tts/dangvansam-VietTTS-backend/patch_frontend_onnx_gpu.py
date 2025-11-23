"""
Patch viet-tts frontend.py to fix ONNX Runtime GPU DLL loading with proper error handling
Sửa viet-tts frontend.py để sửa vấn đề tải DLL ONNX Runtime GPU với xử lý lỗi đúng cách
"""
import os
import sys
from pathlib import Path

def patch_frontend_onnx_gpu():
    """
    Patch viettts/frontend.py to add proper error handling for ONNX Runtime GPU DLL loading
    Sửa viettts/frontend.py để thêm xử lý lỗi đúng cách cho việc tải DLL ONNX Runtime GPU
    """
    # Find viet-tts repo
    # File is in: tts/dangvansam-VietTTS-backend/patch_frontend_onnx_gpu.py
    # Go up 3 levels: patch_frontend_onnx_gpu.py -> dangvansam-VietTTS-backend -> tts -> novel-reader
    project_root = Path(__file__).parent.parent.parent
    viettts_repo = project_root / "tts" / "viet-tts"
    frontend_file = viettts_repo / "viettts" / "frontend.py"
    
    if not frontend_file.exists():
        print(f"❌ Frontend file not found: {frontend_file}")
        return False
    
    # Read current content
    with open(frontend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already patched
    if "ONNX_GPU_PATCH_V2" in content:
        print("✅ Frontend already patched")
        return True
    
    # Find the ONNX Runtime session creation code
    old_code = '''        self.speech_tokenizer_session = onnxruntime.InferenceSession(
            speech_tokenizer_model,
            sess_options=option,
            providers=["CUDAExecutionProvider" if torch.cuda.is_available() else "CPUExecutionProvider"]
        )'''
    
    # New code with proper error handling and fallback
    new_code = '''        # ONNX_GPU_PATCH_V2: Try CUDA with proper error handling, fallback to CPU if DLL fails
        # ONNX_GPU_PATCH_V2: Thử CUDA với xử lý lỗi đúng cách, chuyển sang CPU nếu DLL thất bại
        if torch.cuda.is_available():
            try:
                # Try CUDA provider first with explicit provider options
                # Thử CUDA provider trước với tùy chọn provider rõ ràng
                provider_options = [{
                    'device_id': 0,
                    'arena_extend_strategy': 'kNextPowerOfTwo',
                    'gpu_mem_limit': 2 * 1024 * 1024 * 1024,  # 2GB
                    'cudnn_conv_algo_search': 'EXHAUSTIVE',
                    'do_copy_in_default_stream': True,
                }]
                self.speech_tokenizer_session = onnxruntime.InferenceSession(
                    speech_tokenizer_model,
                    sess_options=option,
                    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
                    provider_options=provider_options
                )
                # Verify it's actually using CUDA
                actual_providers = self.speech_tokenizer_session.get_providers()
                if "CUDAExecutionProvider" in actual_providers and self.speech_tokenizer_session.get_providers()[0] == "CUDAExecutionProvider":
                    logger.info("✅ Using CUDAExecutionProvider for speech tokenizer")
                else:
                    logger.warning("⚠️  CUDAExecutionProvider requested but not used, falling back to CPU")
                    raise RuntimeError("CUDA provider not active")
            except (OSError, RuntimeError, Exception) as e:
                # If CUDA DLL loading fails (WinError 193), use CPU
                # Nếu tải DLL CUDA thất bại (WinError 193), dùng CPU
                error_msg = str(e)
                if "193" in error_msg or "WinError" in error_msg or "not a valid Win32 application" in error_msg:
                    logger.warning(f"⚠️  CUDA DLL loading failed ({error_msg}), using CPU for ONNX (PyTorch will still use GPU)")
                else:
                    logger.warning(f"⚠️  CUDAExecutionProvider failed ({error_msg}), falling back to CPU")
                self.speech_tokenizer_session = onnxruntime.InferenceSession(
                    speech_tokenizer_model,
                    sess_options=option,
                    providers=["CPUExecutionProvider"]
                )
        else:
            self.speech_tokenizer_session = onnxruntime.InferenceSession(
                speech_tokenizer_model,
                sess_options=option,
                providers=["CPUExecutionProvider"]
            )'''
    
    if old_code in content:
        content = content.replace(old_code, new_code)
        
        # Write patched content
        with open(frontend_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Patched {frontend_file}")
        print("✅ Đã patch {frontend_file}")
        print("   ONNX Runtime will use CPU if CUDA DLL fails, but PyTorch models will still use GPU")
        print("   ONNX Runtime sẽ dùng CPU nếu DLL CUDA thất bại, nhưng model PyTorch vẫn dùng GPU")
        return True
    else:
        print("⚠️  Could not find code to patch in frontend.py")
        print("⚠️  Không tìm thấy code để patch trong frontend.py")
        return False

if __name__ == "__main__":
    success = patch_frontend_onnx_gpu()
    sys.exit(0 if success else 1)

