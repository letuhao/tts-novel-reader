# VieNeu-TTS Backend

TTS Backend service using **100% VieNeu-TTS compatible environment**.

Dịch vụ TTS Backend sử dụng **môi trường tương thích 100% với VieNeu-TTS**.

## 🎯 Purpose / Mục đích

This backend uses the **exact same Python environment** as VieNeu-TTS to ensure 100% compatibility. No patches needed!

Backend này sử dụng **chính xác cùng môi trường Python** với VieNeu-TTS để đảm bảo 100% tương thích. Không cần patch!

## ✅ Setup / Cài đặt

### 1. Quick Setup (Automatically clones VieNeu-TTS venv) / Cài đặt nhanh (Tự động sao chép venv của VieNeu-TTS)

```powershell
# Navigate to backend
cd D:\Works\source\novel-reader\tts\vieneu-tts-backend

# Run setup (will clone VieNeu-TTS's venv automatically)
# Chạy setup (sẽ tự động sao chép venv của VieNeu-TTS)
.\setup.ps1

# Run the backend
# Chạy backend
.\run.ps1
```

The setup script will:
- Clone the working VieNeu-TTS venv to `.venv` (100% compatible!)
- Install additional dependencies (FastAPI, uvicorn, etc.)
- Set everything up for you

Script setup sẽ:
- Sao chép venv hoạt động của VieNeu-TTS vào `.venv` (100% tương thích!)
- Cài đặt các phụ thuộc bổ sung (FastAPI, uvicorn, v.v.)
- Thiết lập mọi thứ cho bạn

### 2. Enable GPU (Optional but Recommended) / Bật GPU (Tùy chọn nhưng Khuyến nghị)

The cloned venv may have CPU-only PyTorch. To enable GPU acceleration:

Venv đã sao chép có thể có PyTorch chỉ CPU. Để bật tăng tốc GPU:

```powershell
# Install CUDA-enabled PyTorch (for RTX 4090 and other NVIDIA GPUs)
# Cài đặt PyTorch hỗ trợ CUDA (cho RTX 4090 và các GPU NVIDIA khác)
.\install_cuda.ps1
```

This will:
- Check for NVIDIA GPU
- Uninstall CPU-only PyTorch
- Install CUDA 11.8 PyTorch (compatible with most GPUs)
- Verify installation

Script này sẽ:
- Kiểm tra GPU NVIDIA
- Gỡ cài đặt PyTorch chỉ CPU
- Cài đặt PyTorch CUDA 11.8 (tương thích với hầu hết GPU)
- Xác minh cài đặt

**Note:** After installing CUDA PyTorch, the backend will automatically use GPU when available.

**Lưu ý:** Sau khi cài đặt PyTorch CUDA, backend sẽ tự động sử dụng GPU khi có.

### 3. Manual Venv Clone / Sao chép venv thủ công

If you want to clone the venv manually:
Nếu bạn muốn sao chép venv thủ công:

```powershell
# Clone VieNeu-TTS venv
# Sao chép venv của VieNeu-TTS
.\clone_venv.ps1

# Then run setup to install additional dependencies
# Sau đó chạy setup để cài đặt các phụ thuộc bổ sung
.\setup.ps1
```

## 🚀 Usage / Sử dụng

```powershell
# Activate environment first
# Kích hoạt môi trường trước
..\VieNeu-TTS\.venv\Scripts\Activate.ps1
# OR
.\.venv\Scripts\Activate.ps1

# Run backend
# Chạy backend
python main.py
```

The backend will start on `http://0.0.0.0:11112`

Backend sẽ khởi động trên `http://0.0.0.0:11112`

## 📋 API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /docs` - API documentation
- `POST /api/tts/synthesize` - Synthesize speech

See `tts_backend/api.py` for full API documentation.

Xem `tts_backend/api.py` để biết tài liệu API đầy đủ.

## 🔧 Configuration / Cấu hình

Configuration is in `tts_backend/config.py`. It automatically detects paths relative to the project root.

Cấu hình nằm trong `tts_backend/config.py`. Nó tự động phát hiện đường dẫn tương đối với root dự án.

## ✅ Benefits / Lợi ích

- ✅ **100% compatible** with VieNeu-TTS (same environment)
- ✅ **No patches needed** (HubertModel works out of the box)
- ✅ **Simple setup** (just use VieNeu-TTS's venv)
- ✅ **Proven to work** (same setup as `test_female_voice.py`)

- ✅ **100% tương thích** với VieNeu-TTS (cùng môi trường)
- ✅ **Không cần patch** (HubertModel hoạt động ngay)
- ✅ **Setup đơn giản** (chỉ cần dùng venv của VieNeu-TTS)
- ✅ **Đã được chứng minh** (cùng setup với `test_female_voice.py`)

## 📁 Structure / Cấu trúc

```
tts/vieneu-tts-backend/
├── main.py              # FastAPI app entry point
├── requirements.txt     # Dependencies (VieNeu-TTS + FastAPI)
├── tts_backend/        # Backend code
│   ├── api.py          # API routes
│   ├── config.py       # Configuration
│   ├── service.py      # TTS service
│   ├── storage.py      # Audio storage
│   └── models/         # Model wrappers
│       ├── vieneu_tts.py  # VieNeu-TTS wrapper (NO PATCHES!)
│       └── dia_tts.py     # Dia TTS wrapper
└── README.md           # This file
```

