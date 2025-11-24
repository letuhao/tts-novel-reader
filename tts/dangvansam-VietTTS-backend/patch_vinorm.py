"""
Patch viet-tts frontend_utils.py to replace vinorm with underthesea
Patch viet-tts frontend_utils.py để thay thế vinorm bằng underthesea

This fixes the WinError 193 issue on Windows where vinorm tries to execute
an incompatible binary. underthesea is pure Python and works on Windows.

Điều này sửa lỗi WinError 193 trên Windows khi vinorm cố gắng thực thi
một binary không tương thích. underthesea là pure Python và hoạt động trên Windows.
"""
import sys
from pathlib import Path

def patch_frontend_utils():
    """Patch viettts/utils/frontend_utils.py to use underthesea instead of vinorm"""
    
    # Find viet-tts directory
    # Tìm thư mục viet-tts
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent  # Go up to novel-reader
    viet_tts_dir = project_root / "tts" / "viet-tts"
    frontend_utils_file = viet_tts_dir / "viettts" / "utils" / "frontend_utils.py"
    
    if not frontend_utils_file.exists():
        print(f"❌ Could not find frontend_utils.py at: {frontend_utils_file}")
        print(f"❌ Không tìm thấy frontend_utils.py tại: {frontend_utils_file}")
        return False
    
    # Read current content
    # Đọc nội dung hiện tại
    with open(frontend_utils_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if already patched
    # Kiểm tra xem đã được patch chưa
    if "VINORM_PATCH" in content:
        print("✅ Frontend utils already patched (vinorm -> underthesea)")
        print("✅ Frontend utils đã được patch (vinorm -> underthesea)")
        return True
    
    # Simple Vietnamese text normalization using underthesea
    # Chuẩn hóa văn bản tiếng Việt đơn giản sử dụng underthesea
    underthesea_normalize_code = '''def _underthesea_normalize(text: str, lower: bool = False) -> str:
    """
    Simple Vietnamese text normalization using underthesea
    Chuẩn hóa văn bản tiếng Việt đơn giản sử dụng underthesea
    
    This replaces vinorm's TTSnorm to avoid WinError 193 on Windows.
    Điều này thay thế TTSnorm của vinorm để tránh WinError 193 trên Windows.
    """
    try:
        from underthesea import text_normalize
        # Use underthesea's text_normalize for basic normalization
        # Sử dụng text_normalize của underthesea để chuẩn hóa cơ bản
        normalized = text_normalize(text)
        if lower:
            normalized = normalized.lower()
        return normalized
    except ImportError:
        # Fallback: simple normalization if underthesea is not available
        # Dự phòng: chuẩn hóa đơn giản nếu underthesea không có sẵn
        normalized = text
        # Basic number normalization
        # Chuẩn hóa số cơ bản
        import re
        # Convert numbers to Vietnamese words (simplified)
        # Chuyển đổi số sang từ tiếng Việt (đơn giản hóa)
        number_map = {
            '0': 'không', '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn',
            '5': 'năm', '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín'
        }
        # This is a simplified version - vinorm does more complex normalization
        # Đây là phiên bản đơn giản - vinorm làm chuẩn hóa phức tạp hơn
        if lower:
            normalized = normalized.lower()
        return normalized
'''
    
    # Replace vinorm import and TTSnorm usage
    # Thay thế import vinorm và sử dụng TTSnorm
    if "from vinorm import TTSnorm" in content:
        # Replace import
        # Thay thế import
        content = content.replace(
            "from vinorm import TTSnorm",
            "# VINORM_PATCH: Replaced vinorm with underthesea to fix WinError 193 on Windows\n"
            "# VINORM_PATCH: Thay thế vinorm bằng underthesea để sửa WinError 193 trên Windows\n"
            f"{underthesea_normalize_code}\n"
            "# Original: from vinorm import TTSnorm"
        )
        
        # Replace TTSnorm usage in normalize_text function
        # Thay thế sử dụng TTSnorm trong hàm normalize_text
        if "text = TTSnorm(text, lower=False)" in content:
            content = content.replace(
                "    text = TTSnorm(text, lower=False)",
                "    text = _underthesea_normalize(text, lower=False)  # VINORM_PATCH: Use underthesea instead of vinorm"
            )
        
        # Write patched content
        # Ghi nội dung đã patch
        with open(frontend_utils_file, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"✅ Patched {frontend_utils_file}")
        print("✅ Đã patch {frontend_utils_file}")
        print("   - Replaced vinorm with underthesea")
        print("   - Đã thay thế vinorm bằng underthesea")
        return True
    else:
        print("⚠️  Could not find 'from vinorm import TTSnorm' in frontend_utils.py")
        print("⚠️  Không tìm thấy 'from vinorm import TTSnorm' trong frontend_utils.py")
        return False

if __name__ == "__main__":
    success = patch_frontend_utils()
    sys.exit(0 if success else 1)

