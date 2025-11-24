# Restart All Servers (VietTTS Backend + Frontend)
# Khởi động lại Tất cả Server (VietTTS Backend + Frontend)

Write-Host "=== Restarting All Servers (VietTTS Backend + Frontend) ===" -ForegroundColor Cyan
Write-Host "=== Khởi động lại Tất cả Server (VietTTS Backend + Frontend) ===" -ForegroundColor Cyan
Write-Host ""

# Stop VieNeu-TTS Backend (if running)
Write-Host "Stopping VieNeu-TTS Backend (if running)..." -ForegroundColor Yellow
Write-Host "Đang dừng VieNeu-TTS Backend (nếu đang chạy)..." -ForegroundColor Yellow
cd tts\vieneu-tts-backend
if (Test-Path "stop_backend.py") {
    # Use Python script to avoid antivirus blocking
    python stop_backend.py
} else {
    Write-Host "   ℹ️  No stop script found (may not be running)" -ForegroundColor Gray
    Write-Host "   ℹ️  Không tìm thấy script dừng (có thể không đang chạy)" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# Stop VietTTS Backend
Write-Host ""
Write-Host "Stopping VietTTS Backend..." -ForegroundColor Yellow
Write-Host "Đang dừng VietTTS Backend..." -ForegroundColor Yellow
cd ..\dangvansam-VietTTS-backend
if (Test-Path "stop_backend.py") {
    # Use Python script to avoid antivirus blocking
    python stop_backend.py
} else {
    Write-Host "   ⚠️  No stop script found!" -ForegroundColor Yellow
    Write-Host "   ⚠️  Không tìm thấy script dừng!" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# Stop Novel Backend
Write-Host ""
Write-Host "Stopping Novel Backend..." -ForegroundColor Yellow
Write-Host "Đang dừng Novel Backend..." -ForegroundColor Yellow
cd ..\..\novel-app\backend
if (Test-Path "stop_backend.py") {
    python stop_backend.py
}
Start-Sleep -Seconds 2

# Stop Frontend
Write-Host ""
Write-Host "Stopping Frontend..." -ForegroundColor Yellow
Write-Host "Đang dừng Frontend..." -ForegroundColor Yellow
cd ..\frontend
$frontendProcess = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($frontendProcess) {
    try {
        Stop-Process -Id $frontendProcess -Force -ErrorAction Stop
        Write-Host "   ✅ Stopped frontend process $frontendProcess" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Could not stop frontend process: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ℹ️  No frontend process found on port 5173" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# Start VietTTS Backend
Write-Host ""
Write-Host "Starting VietTTS Backend..." -ForegroundColor Cyan
Write-Host "Đang khởi động VietTTS Backend..." -ForegroundColor Cyan
cd ..\..\tts\dangvansam-VietTTS-backend
if (Test-Path "start_backend.py") {
    # Use Python script to avoid antivirus blocking
    python start_backend.py
} elseif (Test-Path "start_backend.ps1") {
    .\start_backend.ps1
} else {
    Write-Host "   ⚠️  No start script found!" -ForegroundColor Yellow
    Write-Host "   ⚠️  Không tìm thấy script khởi động!" -ForegroundColor Yellow
}
Start-Sleep -Seconds 5

# Start Novel Backend with viettts model
Write-Host ""
Write-Host "Starting Novel Backend with VietTTS model..." -ForegroundColor Cyan
Write-Host "Đang khởi động Novel Backend với model VietTTS..." -ForegroundColor Cyan
cd ..\..\novel-app\backend

# Set environment variable for TTS model
# Thiết lập biến môi trường cho TTS model
$env:TTS_DEFAULT_MODEL = "viettts"
Write-Host "   ✅ Set TTS_DEFAULT_MODEL=viettts" -ForegroundColor Green
Write-Host "   ✅ Đã thiết lập TTS_DEFAULT_MODEL=viettts" -ForegroundColor Green

python start_backend.py
Start-Sleep -Seconds 5

# Start Frontend
Write-Host ""
Write-Host "Starting Frontend..." -ForegroundColor Cyan
Write-Host "Đang khởi động Frontend..." -ForegroundColor Cyan
cd ..\frontend

# Check if node_modules exists (dependencies installed)
if (-not (Test-Path "node_modules")) {
    Write-Host "   ⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Write-Host "   ⚠️  Không tìm thấy node_modules. Đang cài đặt dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if already running
$existingFrontend = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($existingFrontend) {
    Write-Host "   ⚠️  Frontend is already running on port 5173!" -ForegroundColor Yellow
    Write-Host "   ⚠️  Frontend đang chạy trên port 5173 rồi!" -ForegroundColor Yellow
} else {
    # Start frontend in a new window
    Write-Host "   🚀 Starting frontend dev server..." -ForegroundColor Cyan
    Write-Host "   🚀 Đang khởi động frontend dev server..." -ForegroundColor Cyan
    
    # Get the full path to the frontend directory
    $frontendDir = (Get-Location).Path
    
    # Start npm run dev in a new window
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev" -WindowStyle Normal
    
    Start-Sleep -Seconds 8  # Wait longer for frontend to start
}

# Check status
Write-Host ""
Write-Host "=== Checking Server Status ===" -ForegroundColor Green
Write-Host "=== Đang kiểm tra Trạng thái Server ===" -ForegroundColor Green
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

$frontend = try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing
    $true
} catch {
    $false
}

if ($tts) {
    Write-Host "✅ VietTTS Backend (port 11111): Running" -ForegroundColor Green
    Write-Host "✅ VietTTS Backend (port 11111): Đang chạy" -ForegroundColor Green
} else {
    Write-Host "❌ VietTTS Backend (port 11111): Not responding" -ForegroundColor Red
    Write-Host "❌ VietTTS Backend (port 11111): Không phản hồi" -ForegroundColor Red
}

if ($novel) {
    Write-Host "✅ Novel Backend (port 11110): Running" -ForegroundColor Green
    Write-Host "✅ Novel Backend (port 11110): Đang chạy" -ForegroundColor Green
} else {
    Write-Host "❌ Novel Backend (port 11110): Not responding" -ForegroundColor Red
    Write-Host "❌ Novel Backend (port 11110): Không phản hồi" -ForegroundColor Red
}

if ($frontend) {
    Write-Host "✅ Frontend (port 5173): Running" -ForegroundColor Green
    Write-Host "✅ Frontend (port 5173): Đang chạy" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend (port 5173): Not responding (may still be starting)" -ForegroundColor Yellow
    Write-Host "⚠️  Frontend (port 5173): Không phản hồi (có thể vẫn đang khởi động)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== All Servers Restarted! ===" -ForegroundColor Green
Write-Host "=== Tất cả Server đã được Khởi động lại! ===" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Server URLs:" -ForegroundColor Cyan
Write-Host "  - VietTTS Backend: http://127.0.0.1:11111" -ForegroundColor White
Write-Host "  - Novel Backend: http://127.0.0.1:11110" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "📝 Note: Using VietTTS Backend (dangvansam-VietTTS-backend)" -ForegroundColor Cyan
Write-Host "📝 Lưu ý: Đang sử dụng VietTTS Backend (dangvansam-VietTTS-backend)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Opening frontend in browser..." -ForegroundColor Cyan
Write-Host "🌐 Đang mở frontend trong trình duyệt..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

# Open browser to frontend
try {
    Start-Process "http://localhost:5173"
    Write-Host "✅ Browser opened!" -ForegroundColor Green
    Write-Host "✅ Trình duyệt đã được mở!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not open browser automatically. Please open http://localhost:5173 manually" -ForegroundColor Yellow
    Write-Host "⚠️  Không thể tự động mở trình duyệt. Vui lòng mở http://localhost:5173 thủ công" -ForegroundColor Yellow
}

Write-Host ""

