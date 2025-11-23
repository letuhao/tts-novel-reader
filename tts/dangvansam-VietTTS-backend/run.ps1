# Run DangVanSam VietTTS Backend
# Chạy DangVanSam VietTTS Backend

Write-Host "🚀 Starting DangVanSam VietTTS Backend..." -ForegroundColor Green
Write-Host "🚀 Đang khởi động DangVanSam VietTTS Backend..." -ForegroundColor Green
Write-Host ""

# Use local cloned venv (100% compatible with VietTTS)
# Sử dụng venv local đã sao chép (100% tương thích với VietTTS)
$local_venv = ".\.venv\Scripts\Activate.ps1"

if (Test-Path $local_venv) {
    Write-Host "✅ Using cloned VietTTS venv" -ForegroundColor Green
    Write-Host "✅ Sử dụng venv VietTTS đã sao chép" -ForegroundColor Green
    Write-Host ""
    & $local_venv
} else {
    Write-Host "❌ No virtual environment found!" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy môi trường ảo!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run setup first to clone VietTTS venv:" -ForegroundColor Yellow
    Write-Host "Vui lòng chạy setup trước để sao chép venv của VietTTS:" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or clone venv manually:" -ForegroundColor Yellow
    Write-Host "Hoặc sao chép venv thủ công:" -ForegroundColor Yellow
    Write-Host "  .\clone_venv.ps1" -ForegroundColor White
    exit 1
}

<# 
 Configure CUDA for this backend
 Cấu hình CUDA cho backend này

 We prefer CUDA 11.8 for ONNX Runtime GPU 1.16.0 (officially built for 11.8).
 The system also has CUDA 13.0, but that can cause WinError 193 for ONNX.
 Chúng ta ưu tiên CUDA 11.8 cho ONNX Runtime GPU 1.16.0 (build chính thức cho 11.8).
 Hệ thống cũng có CUDA 13.0, nhưng có thể gây WinError 193 cho ONNX.
#>

$cuda11Root = "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8"
if (Test-Path $cuda11Root) {
    $cuda11Bin = Join-Path $cuda11Root "bin"
    Write-Host "✅ Found CUDA 11.8 at: $cuda11Root" -ForegroundColor Green
    Write-Host "✅ Đã tìm thấy CUDA 11.8 tại: $cuda11Root" -ForegroundColor Green

    # Set CUDA_PATH to 11.8 for this process
    # Đặt CUDA_PATH thành 11.8 cho tiến trình này
    $env:CUDA_PATH = $cuda11Root

    # Prepend 11.8 bin to PATH so its DLLs are loaded first
    # Thêm thư mục bin của 11.8 vào đầu PATH để DLL của nó được load trước
    if ($env:PATH -notlike "*$cuda11Bin*") {
        $env:PATH = "$cuda11Bin;$env:PATH"
        Write-Host "✅ Using CUDA 11.8 bin in PATH for this backend run" -ForegroundColor Green
        Write-Host "✅ Sử dụng CUDA 11.8 bin trong PATH cho lần chạy backend này" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  CUDA 11.8 bin already in PATH" -ForegroundColor Yellow
        Write-Host "ℹ️  CUDA 11.8 bin đã có trong PATH" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  CUDA 11.8 not found at: $cuda11Root" -ForegroundColor Yellow
    Write-Host "⚠️  Không tìm thấy CUDA 11.8 tại: $cuda11Root" -ForegroundColor Yellow
    Write-Host "   ONNX Runtime will use whatever CUDA runtime is available (may cause WinError 193)" -ForegroundColor Yellow
    Write-Host "   ONNX Runtime sẽ dùng CUDA runtime hiện có (có thể gây WinError 193)" -ForegroundColor Yellow
}

# Run the backend
# Chạy backend
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Write-Host "🚀 Đang khởi động server backend..." -ForegroundColor Green
Write-Host ""
python main.py

