"""
Audio Storage Management
Quản lý Lưu trữ Audio
"""
import os
import json
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import threading
import shutil


class AudioStorage:
    """Manages audio file storage with expiration / Quản lý lưu trữ file audio với thời gian hết hạn"""
    
    def __init__(
        self,
        storage_dir: str = "storage/audio",
        default_expiry_hours: int = 24,
        cleanup_interval_minutes: int = 60
    ):
        """
        Initialize audio storage / Khởi tạo lưu trữ audio
        
        Args:
            storage_dir: Directory to store audio files / Thư mục lưu file audio
            default_expiry_hours: Default expiration time in hours / Thời gian hết hạn mặc định (giờ)
            cleanup_interval_minutes: Cleanup interval in minutes / Khoảng thời gian dọn dẹp (phút)
        """
        # Convert to absolute path to avoid issues with working directory changes
        storage_path = Path(storage_dir)
        if not storage_path.is_absolute():
            from .config import BASE_DIR
            storage_path = BASE_DIR / storage_path
        
        self.storage_dir = storage_path.resolve()
        self.metadata_dir = self.storage_dir / "metadata"
        self.default_expiry_hours = default_expiry_hours
        
        # Create directories
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"[AudioStorage] Storage directory: {self.storage_dir}")
        print(f"[AudioStorage] Metadata directory: {self.metadata_dir}")
        
        # Metadata cache
        self.metadata_cache: Dict[str, Dict] = {}
        
        # Start cleanup thread
        self._cleanup_thread = None
        self._stop_cleanup = False
        self._cleanup_interval = cleanup_interval_minutes * 60
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self):
        """Start background cleanup thread / Khởi động thread dọn dẹp nền"""
        def cleanup_loop():
            while not self._stop_cleanup:
                time.sleep(self._cleanup_interval)
                try:
                    self.cleanup_expired()
                except Exception as e:
                    print(f"Error during cleanup: {e}")
        
        self._cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        self._cleanup_thread.start()
    
    def _generate_file_id(self, text: str, voice: str, model: str) -> str:
        """Generate unique file ID / Tạo ID file duy nhất"""
        content = f"{text}_{voice}_{model}_{time.time()}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def save_audio(
        self,
        audio_data: bytes,
        text: str,
        voice: str,
        model: str,
        expiry_hours: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Save audio file with metadata / Lưu file audio với metadata
        
        Args:
            audio_data: Audio file bytes / Bytes file audio
            text: Input text / Văn bản đầu vào
            voice: Voice name / Tên giọng
            model: Model used / Model sử dụng
            expiry_hours: Expiration hours (None = use default) / Giờ hết hạn
            metadata: Additional metadata / Metadata bổ sung
            
        Returns:
            Dictionary with file info / Từ điển với thông tin file
        """
        # Generate file ID
        file_id = self._generate_file_id(text, voice, model)
        
        # Set expiration time
        if expiry_hours is None:
            expiry_hours = self.default_expiry_hours
        
        expires_at = datetime.now() + timedelta(hours=expiry_hours)
        
        # Save audio file
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        audio_path = self.storage_dir / f"{file_id}.wav"
        with open(audio_path, "wb") as f:
            f.write(audio_data)
        
        # Create metadata
        file_metadata = {
            "file_id": file_id,
            "file_path": str(audio_path),
            "file_name": audio_path.name,
            "text": text,
            "voice": voice,
            "model": model,
            "created_at": datetime.now().isoformat(),
            "expires_at": expires_at.isoformat(),
            "expiry_hours": expiry_hours,
            "file_size": len(audio_data),
            "file_size_mb": len(audio_data) / (1024 * 1024),
            **(metadata or {})
        }
        
        # Save metadata
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        metadata_path = self.metadata_dir / f"{file_id}.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(file_metadata, f, indent=2, ensure_ascii=False)
        
        # Cache metadata
        self.metadata_cache[file_id] = file_metadata
        
        return file_metadata
    
    def get_audio(self, file_id: str) -> Optional[bytes]:
        """
        Get audio file by ID / Lấy file audio theo ID
        
        Args:
            file_id: File ID / ID file
            
        Returns:
            Audio bytes or None if not found/expired / Bytes audio hoặc None nếu không tìm thấy/hết hạn
        """
        metadata = self.get_metadata(file_id)
        if not metadata:
            return None
        
        # Check expiration
        expires_at = datetime.fromisoformat(metadata["expires_at"])
        if datetime.now() > expires_at:
            return None
        
        # Read audio file
        audio_path = Path(metadata["file_path"])
        if not audio_path.exists():
            return None
        
        with open(audio_path, "rb") as f:
            return f.read()
    
    def get_metadata(self, file_id: str) -> Optional[Dict]:
        """
        Get file metadata / Lấy metadata file
        
        Args:
            file_id: File ID / ID file
            
        Returns:
            Metadata dictionary or None / Từ điển metadata hoặc None
        """
        # Check cache first
        if file_id in self.metadata_cache:
            metadata = self.metadata_cache[file_id]
            # Check expiration
            expires_at = datetime.fromisoformat(metadata["expires_at"])
            if datetime.now() > expires_at:
                del self.metadata_cache[file_id]
                return None
            return metadata
        
        # Load from file
        metadata_path = self.metadata_dir / f"{file_id}.json"
        if not metadata_path.exists():
            return None
        
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            
            # Check expiration
            expires_at = datetime.fromisoformat(metadata["expires_at"])
            if datetime.now() > expires_at:
                return None
            
            # Cache it
            self.metadata_cache[file_id] = metadata
            return metadata
        except Exception:
            return None
    
    def delete_audio(self, file_id: str) -> bool:
        """
        Delete audio file and metadata / Xóa file audio và metadata
        
        Args:
            file_id: File ID / ID file
            
        Returns:
            True if deleted, False otherwise / True nếu đã xóa, False nếu không
        """
        metadata = self.get_metadata(file_id)
        if not metadata:
            return False
        
        # Delete audio file
        audio_path = Path(metadata["file_path"])
        if audio_path.exists():
            try:
                audio_path.unlink()
            except Exception:
                pass
        
        # Delete metadata file
        metadata_path = self.metadata_dir / f"{file_id}.json"
        if metadata_path.exists():
            try:
                metadata_path.unlink()
            except Exception:
                pass
        
        # Remove from cache
        if file_id in self.metadata_cache:
            del self.metadata_cache[file_id]
        
        return True
    
    def cleanup_expired(self) -> Dict:
        """
        Clean up expired audio files / Dọn dẹp file audio hết hạn
        
        Returns:
            Statistics about cleanup / Thống kê về dọn dẹp
        """
        deleted_count = 0
        deleted_size = 0
        now = datetime.now()
        
        # Find all metadata files
        for metadata_path in self.metadata_dir.glob("*.json"):
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                
                expires_at = datetime.fromisoformat(metadata["expires_at"])
                if now > expires_at:
                    # Expired, delete it
                    file_id = metadata["file_id"]
                    if self.delete_audio(file_id):
                        deleted_count += 1
                        deleted_size += metadata.get("file_size", 0)
            except Exception:
                # Invalid metadata, try to delete it
                try:
                    metadata_path.unlink()
                except Exception:
                    pass
        
        # Clear expired from cache
        expired_ids = [
            file_id for file_id, metadata in self.metadata_cache.items()
            if datetime.now() > datetime.fromisoformat(metadata["expires_at"])
        ]
        for file_id in expired_ids:
            del self.metadata_cache[file_id]
        
        return {
            "deleted_count": deleted_count,
            "deleted_size_mb": deleted_size / (1024 * 1024),
            "cleanup_time": datetime.now().isoformat()
        }
    
    def shutdown(self):
        """Shutdown storage and cleanup thread / Tắt lưu trữ và thread dọn dẹp"""
        self._stop_cleanup = True
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)


# Global storage instance / Instance lưu trữ toàn cục
_storage_instance: Optional[AudioStorage] = None


def get_storage() -> AudioStorage:
    """Get global storage instance / Lấy instance lưu trữ toàn cục"""
    global _storage_instance
    if _storage_instance is None:
        from .config import STORAGE_DIR, DEFAULT_EXPIRY_HOURS, CLEANUP_INTERVAL_MINUTES
        _storage_instance = AudioStorage(
            storage_dir=STORAGE_DIR,
            default_expiry_hours=DEFAULT_EXPIRY_HOURS,
            cleanup_interval_minutes=CLEANUP_INTERVAL_MINUTES
        )
    return _storage_instance

