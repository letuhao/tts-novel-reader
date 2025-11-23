# Run VieNeu-TTS Backend
# Chạy VieNeu-TTS Backend

Write-Host "🚀 Starting VieNeu-TTS Backend..." -ForegroundColor Green
Write-Host "🚀 Đang khởi động VieNeu-TTS Backend..." -ForegroundColor Green
Write-Host ""

# Use local cloned venv (100% compatible with VieNeu-TTS)
# Sử dụng venv local đã sao chép (100% tương thích với VieNeu-TTS)
$local_venv = ".\.venv\Scripts\Activate.ps1"

if (Test-Path $local_venv) {
    Write-Host "✅ Using cloned VieNeu-TTS venv" -ForegroundColor Green
    Write-Host "✅ Sử dụng venv VieNeu-TTS đã sao chép" -ForegroundColor Green
    Write-Host ""
    & $local_venv
} else {
    Write-Host "❌ No virtual environment found!" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy môi trường ảo!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run setup first to clone VieNeu-TTS venv:" -ForegroundColor Yellow
    Write-Host "Vui lòng chạy setup trước để sao chép venv của VieNeu-TTS:" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or clone venv manually:" -ForegroundColor Yellow
    Write-Host "Hoặc sao chép venv thủ công:" -ForegroundColor Yellow
    Write-Host "  .\clone_venv.ps1" -ForegroundColor White
    exit 1
}

# Run the backend
# Chạy backend
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Write-Host "🚀 Đang khởi động server backend..." -ForegroundColor Green
Write-Host ""
python main.py

