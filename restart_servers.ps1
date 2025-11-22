# Restart Both Servers
# Khởi động lại Cả hai Server

Write-Host "=== Restarting All Servers ===" -ForegroundColor Cyan
Write-Host "=== Khởi động lại Tất cả Server ===" -ForegroundColor Cyan
Write-Host ""

# Stop TTS Backend
Write-Host "Stopping TTS Backend..." -ForegroundColor Yellow
cd app
if (Test-Path "stop_backend.py") {
    python stop_backend.py
}
Start-Sleep -Seconds 2

# Stop Novel Backend
Write-Host ""
Write-Host "Stopping Novel Backend..." -ForegroundColor Yellow
cd ..\novel-app\backend
if (Test-Path "stop_backend.py") {
    python stop_backend.py
}
Start-Sleep -Seconds 2

# Start TTS Backend
Write-Host ""
Write-Host "Starting TTS Backend..." -ForegroundColor Cyan
cd ..\..\app
python start_backend.py
Start-Sleep -Seconds 5

# Start Novel Backend
Write-Host ""
Write-Host "Starting Novel Backend..." -ForegroundColor Cyan
cd ..\novel-app\backend
python start_backend.py
Start-Sleep -Seconds 5

# Check status
Write-Host ""
Write-Host "=== Checking Server Status ===" -ForegroundColor Green
Write-Host ""

$tts = try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11111/health" -TimeoutSec 2 -UseBasicParsing
    $true
} catch {
    $false
}

$novel = try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11110/health" -TimeoutSec 2 -UseBasicParsing
    $true
} catch {
    $false
}

if ($tts) {
    Write-Host "✅ TTS Backend (port 11111): Running" -ForegroundColor Green
} else {
    Write-Host "❌ TTS Backend (port 11111): Not responding" -ForegroundColor Red
}

if ($novel) {
    Write-Host "✅ Novel Backend (port 11110): Running" -ForegroundColor Green
} else {
    Write-Host "❌ Novel Backend (port 11110): Not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Servers Restarted! ===" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start frontend: cd novel-app/frontend && npm run dev" -ForegroundColor White
Write-Host "  2. Open browser: http://localhost:5173" -ForegroundColor White
Write-Host "  3. Generate audio from frontend to test the fixes" -ForegroundColor White

