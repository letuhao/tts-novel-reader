# Run Coqui TTS Backend
# Chạy Coqui TTS Backend

Write-Host "🚀 Starting Coqui TTS (XTTS-v2) Backend..." -ForegroundColor Green
Write-Host "🚀 Đang khởi động Coqui TTS (XTTS-v2) Backend..." -ForegroundColor Green
Write-Host ""

# Check if venv exists
# Kiểm tra xem venv có tồn tại không
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy môi trường ảo!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run setup first:" -ForegroundColor Yellow
    Write-Host "Chạy setup trước:" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1" -ForegroundColor White
    exit 1
}

# Activate venv
# Kích hoạt venv
.\.venv\Scripts\Activate.ps1

# Run backend
# Chạy backend
Write-Host "Backend will start on http://0.0.0.0:11111" -ForegroundColor Cyan
Write-Host "Backend sẽ khởi động trên http://0.0.0.0:11111" -ForegroundColor Cyan
Write-Host ""
python main.py

