"""
Patch viet-tts frontend.py to fix ONNX Runtime GPU DLL loading
Sửa viet-tts frontend.py để sửa vấn đề tải DLL ONNX Runtime GPU
"""
import os
import sys
from pathlib import Path

def patch_frontend_onnx():
    """
    Patch viettts/frontend.py to add error handling for ONNX Runtime GPU DLL loading
    Sửa viettts/frontend.py để thêm xử lý lỗi cho việc tải DLL ONNX Runtime GPU
    """
    # Find viet-tts repo
    # Tìm repo viet-tts
    project_root = Path(__file__).parent.parent.parent.parent
    viettts_repo = project_root / "tts" / "viet-tts"
    frontend_file = viettts_repo / "viettts" / "frontend.py"
    
    if not frontend_file.exists():
        print(f"❌ Frontend file not found: {frontend_file}")
        return False
    
    # Read current content
    # Đọc nội dung hiện tại
    with open(frontend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already patched
    # Kiểm tra xem đã được patch chưa
    if "ONNX_GPU_PATCH" in content:
        print("✅ Frontend already patched")
        return True
    
    # Find the ONNX Runtime session creation code
    # Tìm code tạo ONNX Runtime session
    old_code = '''        self.speech_tokenizer_session = onnxruntime.InferenceSession(
            speech_tokenizer_model,
            sess_options=option,
            providers=["CUDAExecutionProvider" if torch.cuda.is_available() else "CPUExecutionProvider"]
        )'''
    
    # New code with error handling
    # Code mới với xử lý lỗi
    new_code = '''        # ONNX_GPU_PATCH: Try CUDA first, fallback to CPU if DLL loading fails
        # ONNX_GPU_PATCH: Thử CUDA trước, chuyển sang CPU nếu tải DLL thất bại
        try:
            if torch.cuda.is_available():
                # Try CUDA provider first
                # Thử CUDA provider trước
                try:
                    self.speech_tokenizer_session = onnxruntime.InferenceSession(
                        speech_tokenizer_model,
                        sess_options=option,
                        providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
                    )
                    logger.info("Using CUDAExecutionProvider for speech tokenizer")
                except (OSError, RuntimeError) as e:
                    # If CUDA DLL loading fails, use CPU
                    # Nếu tải DLL CUDA thất bại, dùng CPU
                    logger.warning(f"CUDAExecutionProvider failed ({e}), falling back to CPU")
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
                )
        except Exception as e:
            # Final fallback to CPU
            # Fallback cuối cùng về CPU
            logger.error(f"Failed to create ONNX session: {e}, using CPU")
            self.speech_tokenizer_session = onnxruntime.InferenceSession(
                speech_tokenizer_model,
                sess_options=option,
                providers=["CPUExecutionProvider"]
            )'''
    
    if old_code in content:
        content = content.replace(old_code, new_code)
        
        # Write patched content
        # Ghi nội dung đã patch
        with open(frontend_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Patched {frontend_file}")
        print("✅ Đã patch {frontend_file}")
        return True
    else:
        print("⚠️  Could not find code to patch in frontend.py")
        print("⚠️  Không tìm thấy code để patch trong frontend.py")
        return False

if __name__ == "__main__":
    success = patch_frontend_onnx()
    sys.exit(0 if success else 1)

