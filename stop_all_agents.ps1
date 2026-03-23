# Stop All Services (English Tutor Agent + TTS + STT)
# Dừng Tất cả Services (English Tutor Agent + TTS + STT)
#
# Note: This script may be blocked by antivirus software.
# Use stop_all_agents.py (Python script) instead to avoid blocking.
# Ghi chú: Script này có thể bị chặn bởi phần mềm antivirus.
# Sử dụng stop_all_agents.py (Python script) để tránh bị chặn.

Write-Host "=== Stopping All Services ===" -ForegroundColor Yellow
Write-Host "=== Dừng Tất cả Services ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Note: If this script is blocked, use: python stop_all_agents.py" -ForegroundColor Yellow
Write-Host "⚠️  Ghi chú: Nếu script này bị chặn, sử dụng: python stop_all_agents.py" -ForegroundColor Yellow
Write-Host ""

# Get root directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

# ==================== 1. Stop English Tutor Agent ====================
Write-Host "1. Stopping English Tutor Agent..." -ForegroundColor Yellow
Set-Location english-tutor-agent

if (Test-Path "stop_agent.ps1") {
    .\stop_agent.ps1
} elseif (Test-Path "stop_agent.py") {
    python stop_agent.py
} else {
    # Manual stop by port
    $processOnPort = Get-NetTCPConnection -LocalPort 11300 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processOnPort) {
        Stop-Process -Id $processOnPort -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Stopped process on port 11300" -ForegroundColor Green
    }
}
Start-Sleep -Seconds 2
Write-Host ""

# ==================== 2. Stop Coqui TTS Backend ====================
Write-Host "2. Stopping Coqui TTS Backend..." -ForegroundColor Yellow
Set-Location ..\tts\coqui-ai-tts-backend

if (Test-Path "stop_backend.py") {
    python stop_backend.py
} elseif (Test-Path "stop_backend.ps1") {
    .\stop_backend.ps1
} else {
    # Manual stop by port
    $processOnPort = Get-NetTCPConnection -LocalPort 11111 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processOnPort) {
        Stop-Process -Id $processOnPort -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Stopped process on port 11111" -ForegroundColor Green
    }
}
Start-Sleep -Seconds 2
Write-Host ""

# ==================== 3. Stop Whisper STT Backend ====================
Write-Host "3. Stopping Whisper STT Backend..." -ForegroundColor Yellow
Set-Location ..\..\stt

# Manual stop by port (STT may not have stop script)
$processOnPort = Get-NetTCPConnection -LocalPort 11210 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processOnPort) {
    Stop-Process -Id $processOnPort -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Stopped process on port 11210" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No process found on port 11210" -ForegroundColor Gray
}
Start-Sleep -Seconds 2
Write-Host ""

# ==================== 4. Stop PostgreSQL (Optional) ====================
Write-Host "4. PostgreSQL Docker container..." -ForegroundColor Yellow
Write-Host "   ℹ️  PostgreSQL container left running (use 'docker compose down' to stop)" -ForegroundColor Gray
Write-Host ""

Write-Host "=== All Services Stopped! ===" -ForegroundColor Green
Write-Host "=== Tất cả Services đã được Dừng! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Note: PostgreSQL container is still running." -ForegroundColor Cyan
Write-Host "To stop it: cd english-tutor-agent && docker compose down" -ForegroundColor Cyan
Write-Host ""

Set-Location $rootDir

