# Fix ONNX Runtime CUDA - Automated
# Sửa ONNX Runtime CUDA - Tự động

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Fixing ONNX Runtime CUDA Provider..."
Write-Host "Đang sửa ONNX Runtime CUDA Provider..."
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$venvPython = "D:\Works\source\novel-reader\tts\dangvansam-VietTTS-backend\.venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "❌ Virtual environment not found at: $venvPython" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Uninstalling CPU-only onnxruntime..." -ForegroundColor Yellow
Write-Host "Bước 1: Đang gỡ cài đặt onnxruntime chỉ CPU..." -ForegroundColor Yellow
& $venvPython -m pip uninstall onnxruntime -y

Write-Host ""
Write-Host "Step 2: Installing onnxruntime-gpu..." -ForegroundColor Yellow
Write-Host "Bước 2: Đang cài đặt onnxruntime-gpu..." -ForegroundColor Yellow
& $venvPython -m pip install onnxruntime-gpu

Write-Host ""
Write-Host "Step 3: Verifying CUDA provider..." -ForegroundColor Yellow
Write-Host "Bước 3: Đang xác minh CUDA provider..." -ForegroundColor Yellow
& $venvPython -c "import onnxruntime as ort; providers = ort.get_available_providers(); print('Available providers:', providers); print('CUDA available:', 'CUDAExecutionProvider' in providers)"

Write-Host ""
Write-Host "✅ Fix completed! Please restart the backend." -ForegroundColor Green
Write-Host "✅ Sửa chữa hoàn tất! Vui lòng khởi động lại backend." -ForegroundColor Green

