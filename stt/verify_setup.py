"""
Verify STT Backend Setup
Check that all required files and model exist
"""
from pathlib import Path
import sys

def verify_setup():
    """Verify STT backend setup"""
    print("Verifying STT Backend Setup...")
    print("=" * 50)
    
    # Check base directory
    base_dir = Path(__file__).parent
    print(f"✓ Base directory: {base_dir}")
    
    # Check required files
    required_files = [
        "main.py",
        "requirements.txt",
        "stt_backend/__init__.py",
        "stt_backend/config.py",
        "stt_backend/service.py",
        "stt_backend/api.py",
    ]
    
    print("\nChecking required files...")
    all_files_exist = True
    for file_path in required_files:
        full_path = base_dir / file_path
        exists = full_path.exists()
        status = "✓" if exists else "✗"
        print(f"{status} {file_path}")
        if not exists:
            all_files_exist = False
    
    # Check model
    print("\nChecking model...")
    models_dir = base_dir.parent / "models"
    model_path = models_dir / "faster-whisper-large-v3"
    model_bin = model_path / "model.bin"
    
    print(f"  Models directory: {models_dir}")
    print(f"  Model path: {model_path}")
    print(f"  Model exists: {'✓' if model_path.exists() else '✗'}")
    print(f"  model.bin exists: {'✓' if model_bin.exists() else '✗'}")
    
    if model_bin.exists():
        size_mb = model_bin.stat().st_size / (1024 * 1024)
        print(f"  model.bin size: {size_mb:.2f} MB")
    
    # Summary
    print("\n" + "=" * 50)
    if all_files_exist and model_bin.exists():
        print("✅ Setup verification PASSED!")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Start service: python main.py")
        print("3. Test: http://localhost:11210/health")
        return 0
    else:
        print("❌ Setup verification FAILED!")
        if not all_files_exist:
            print("  - Some required files are missing")
        if not model_bin.exists():
            print("  - Model file not found at expected location")
        return 1

if __name__ == "__main__":
    sys.exit(verify_setup())

