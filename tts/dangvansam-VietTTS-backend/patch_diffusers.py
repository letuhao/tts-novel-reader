"""
Patch diffusers to use hf_hub_download instead of cached_download
Sửa diffusers để sử dụng hf_hub_download thay vì cached_download
"""
import sys
from pathlib import Path

# Find diffusers package
try:
    import diffusers
    diffusers_path = Path(diffusers.__file__).parent
    dynamic_modules_path = diffusers_path / "utils" / "dynamic_modules_utils.py"
    
    if dynamic_modules_path.exists():
        # Read the file
        content = dynamic_modules_path.read_text(encoding="utf-8")
        original_content = content
        
        # Replace cached_download with hf_hub_download
        if "cached_download" in content:
            # Replace import - handle both cases
            if "from huggingface_hub import cached_download, hf_hub_download, model_info" in content:
                content = content.replace(
                    "from huggingface_hub import cached_download, hf_hub_download, model_info",
                    "from huggingface_hub import hf_hub_download, model_info"
                )
            elif "from huggingface_hub import cached_download" in content:
                # Handle separate import
                lines = content.split('\n')
                new_lines = []
                for line in lines:
                    if "from huggingface_hub import cached_download" in line and "hf_hub_download" not in line:
                        # Replace with alias
                        new_lines.append(line.replace("cached_download", "hf_hub_download as cached_download"))
                    else:
                        new_lines.append(line)
                content = '\n'.join(new_lines)
            
            # Replace function calls
            content = content.replace("cached_download(", "hf_hub_download(")
            
            # Only write if changed
            if content != original_content:
                # Write back
                dynamic_modules_path.write_text(content, encoding="utf-8")
                print("✅ Patched diffusers to use hf_hub_download instead of cached_download")
                print("✅ Đã sửa diffusers để sử dụng hf_hub_download thay vì cached_download")
            else:
                print("ℹ️  No changes needed in diffusers")
                print("ℹ️  Không cần thay đổi trong diffusers")
        else:
            print("ℹ️  No cached_download found in diffusers (may already be patched)")
            print("ℹ️  Không tìm thấy cached_download trong diffusers (có thể đã được sửa)")
    else:
        print("⚠️  Could not find diffusers/utils/dynamic_modules_utils.py")
        print("⚠️  Không tìm thấy diffusers/utils/dynamic_modules_utils.py")
        print(f"   Searched in: {diffusers_path}")
except ImportError:
    print("⚠️  diffusers not installed yet")
    print("⚠️  diffusers chưa được cài đặt")
except Exception as e:
    print(f"⚠️  Error patching diffusers: {e}")
    print(f"⚠️  Lỗi khi sửa diffusers: {e}")
