# Start DangVanSam VietTTS Backend Service Silently
# Khởi động Dịch vụ DangVanSam VietTTS Backend Im lặng

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if backend is already running
$existingProcess = Get-NetTCPConnection -LocalPort 11111 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($existingProcess) {
    Write-Host "⚠️  DangVanSam VietTTS Backend is already running on port 11111!" -ForegroundColor Yellow
    Write-Host "⚠️  DangVanSam VietTTS Backend đang chạy trên port 11111 rồi!" -ForegroundColor Yellow
    Write-Host "   Process ID: $existingProcess" -ForegroundColor Cyan
    Write-Host "   Stop it first with: .\stop_backend.py" -ForegroundColor Yellow
    exit 1
}

# Set log level to warning for minimal output
$env:TTS_LOG_LEVEL = "warning"

Write-Host "Starting DangVanSam VietTTS Backend in background..." -ForegroundColor Cyan
Write-Host "Đang khởi động DangVanSam VietTTS Backend ở chế độ nền..." -ForegroundColor Cyan

# Create log directory if it doesn't exist
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# CRITICAL: Always use venv Python - never use system Python
# QUAN TRỌNG: Luôn sử dụng Python từ venv - không bao giờ dùng Python hệ thống
$pythonPath = Join-Path $scriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    Write-Host "❌ FATAL ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "❌ LỖI NGHIÊM TRỌNG: Không tìm thấy môi trường ảo!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Expected path: $pythonPath" -ForegroundColor Yellow
    Write-Host "   Đường dẫn mong đợi: $pythonPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please run setup first:" -ForegroundColor Cyan
    Write-Host "   Vui lòng chạy setup trước:" -ForegroundColor Cyan
    Write-Host "     .\setup.ps1" -ForegroundColor White
    Write-Host "   or / hoặc:" -ForegroundColor Cyan
    Write-Host "     python -m venv .venv" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Validate venv Python version
# Xác thực phiên bản Python của venv
try {
    $versionOutput = & $pythonPath --version 2>&1
    Write-Host "✅ Using venv Python: $versionOutput" -ForegroundColor Green
    Write-Host "✅ Đang sử dụng Python venv: $versionOutput" -ForegroundColor Green
    
    # Check if it's Python 3.10.x (recommended for this backend)
    if ($versionOutput -notmatch "3\.(10|11)") {
        Write-Host "⚠️  WARNING: This backend was tested with Python 3.10.x" -ForegroundColor Yellow
        Write-Host "⚠️  CẢNH BÁO: Backend này đã được kiểm tra với Python 3.10.x" -ForegroundColor Yellow
        Write-Host "   Current version: $versionOutput" -ForegroundColor Yellow
        Write-Host "   Phiên bản hiện tại: $versionOutput" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify Python version: $_" -ForegroundColor Yellow
    Write-Host "⚠️  Không thể xác minh phiên bản Python: $_" -ForegroundColor Yellow
}

# Start process in background with logs redirected
$process = Start-Process $pythonPath -ArgumentList "main.py" `
    -WindowStyle Hidden `
    -WorkingDirectory $scriptDir `
    -PassThru `
    -RedirectStandardOutput "$logDir\backend_output.log" `
    -RedirectStandardError "$logDir\backend_error.log" `
    -NoNewWindow

# Wait a moment for it to start
Start-Sleep -Seconds 5

# Check if it's running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11111/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host ""
    Write-Host "✅ DangVanSam VietTTS Backend started successfully!" -ForegroundColor Green
    Write-Host "✅ DangVanSam VietTTS Backend đã được khởi động thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📡 Backend running at: http://127.0.0.1:11111" -ForegroundColor Cyan
    Write-Host "📚 API Docs: http://127.0.0.1:11111/docs" -ForegroundColor Cyan
    Write-Host "❤️  Health Check: http://127.0.0.1:11111/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Logs: $logDir\backend_*.log" -ForegroundColor Gray
    Write-Host "🆔 Process ID: $($process.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop: .\stop_backend.py or python stop_backend.py" -ForegroundColor Yellow
    Write-Host "Để dừng: .\stop_backend.py hoặc python stop_backend.py" -ForegroundColor Yellow
    
    # Save process ID for later use
    $process.Id | Out-File -FilePath "$logDir\backend_pid.txt" -Encoding ASCII
} catch {
    Write-Host ""
    Write-Host "⚠️  Backend may still be starting..." -ForegroundColor Yellow
    Write-Host "⚠️  Backend có thể vẫn đang khởi động..." -ForegroundColor Yellow
    Write-Host "   Process ID: $($process.Id)" -ForegroundColor Gray
    Write-Host "   Check logs: $logDir\backend_*.log" -ForegroundColor Gray
    Write-Host "   Try: http://127.0.0.1:11111/docs in a few seconds" -ForegroundColor Cyan
}

