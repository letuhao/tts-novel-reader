# Start All Services (English Tutor Agent + TTS + STT)
# Khởi động Tất cả Services (English Tutor Agent + TTS + STT)
#
# Note: This script may be blocked by antivirus software.
# Use start_all_agents.py (Python script) instead to avoid blocking.
# Ghi chú: Script này có thể bị chặn bởi phần mềm antivirus.
# Sử dụng start_all_agents.py (Python script) để tránh bị chặn.

Write-Host "=== Starting All Services ===" -ForegroundColor Cyan
Write-Host "=== Khởi động Tất cả Services ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Note: If this script is blocked, use: python start_all_agents.py" -ForegroundColor Yellow
Write-Host "⚠️  Ghi chú: Nếu script này bị chặn, sử dụng: python start_all_agents.py" -ForegroundColor Yellow
Write-Host ""

# Get root directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

# ==================== 1. Start PostgreSQL (Docker) ====================
Write-Host "1. Starting PostgreSQL (Docker)..." -ForegroundColor Cyan
Write-Host "   Đang khởi động PostgreSQL (Docker)..." -ForegroundColor Cyan
Set-Location english-tutor-agent

$postgresRunning = docker compose ps postgres --format json 2>$null | ConvertFrom-Json | Where-Object { $_.State -eq "running" }

if ($postgresRunning) {
    Write-Host "   ✅ PostgreSQL is already running" -ForegroundColor Green
} else {
    docker compose up -d postgres
    Start-Sleep -Seconds 5
    
    # Check if started
    $postgresRunning = docker compose ps postgres --format json 2>$null | ConvertFrom-Json | Where-Object { $_.State -eq "running" }
    if ($postgresRunning) {
        Write-Host "   ✅ PostgreSQL started successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  PostgreSQL may not be running. Check with: docker compose ps" -ForegroundColor Yellow
    }
}
Write-Host ""

# ==================== 2. Start Coqui TTS Backend ====================
Write-Host "2. Starting Coqui TTS Backend..." -ForegroundColor Cyan
Write-Host "   Đang khởi động Coqui TTS Backend..." -ForegroundColor Cyan
Set-Location ..\tts\coqui-ai-tts-backend

# Check if already running
$ttsRunning = Get-NetTCPConnection -LocalPort 11111 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($ttsRunning) {
    Write-Host "   ✅ Coqui TTS Backend is already running (port 11111)" -ForegroundColor Green
} else {
    # Try to start with Python script first, then PowerShell
    if (Test-Path "start_backend.py") {
        python start_backend.py
    } elseif (Test-Path "start_backend.ps1") {
        .\start_backend.ps1
    } else {
        Write-Host "   ⚠️  No start script found in coqui-ai-tts-backend!" -ForegroundColor Yellow
        Write-Host "   ⚠️  Không tìm thấy script khởi động trong coqui-ai-tts-backend!" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 5
    
    # Check if started
    $ttsRunning = Get-NetTCPConnection -LocalPort 11111 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($ttsRunning) {
        Write-Host "   ✅ Coqui TTS Backend started successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Coqui TTS Backend may not be running. Check logs." -ForegroundColor Yellow
    }
}
Write-Host ""

# ==================== 3. Start Whisper STT Backend ====================
Write-Host "3. Starting Whisper STT Backend..." -ForegroundColor Cyan
Write-Host "   Đang khởi động Whisper STT Backend..." -ForegroundColor Cyan
Set-Location ..\..\stt

# Check if already running
$sttRunning = Get-NetTCPConnection -LocalPort 11210 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($sttRunning) {
    Write-Host "   ✅ Whisper STT Backend is already running (port 11210)" -ForegroundColor Green
} else {
    # Try to start with PowerShell script (STT needs cuDNN PATH configuration)
    if (Test-Path "start_backend.ps1") {
        # Start in new window so cuDNN PATH is properly set
        $sttDir = (Get-Location).Path
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$sttDir'; .\start_backend.ps1" -WindowStyle Normal
        Start-Sleep -Seconds 3
    } elseif (Test-Path "start_backend.py") {
        python start_backend.py
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   ⚠️  No start script found in stt!" -ForegroundColor Yellow
        Write-Host "   ⚠️  Không tìm thấy script khởi động trong stt!" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 5
    
    # Check if started
    $sttRunning = Get-NetTCPConnection -LocalPort 11210 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($sttRunning) {
        Write-Host "   ✅ Whisper STT Backend started successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Whisper STT Backend may not be running. Check logs or window." -ForegroundColor Yellow
    }
}
Write-Host ""

# ==================== 4. Start Ollama (if needed) ====================
Write-Host "4. Checking Ollama..." -ForegroundColor Cyan
Write-Host "   Đang kiểm tra Ollama..." -ForegroundColor Cyan

try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Ollama is running (port 11434)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Ollama is not running on port 11434" -ForegroundColor Yellow
    Write-Host "   ⚠️  Start Ollama manually: ollama serve" -ForegroundColor Yellow
}
Write-Host ""

# ==================== 5. Start English Tutor Agent ====================
Write-Host "5. Starting English Tutor Agent..." -ForegroundColor Cyan
Write-Host "   Đang khởi động English Tutor Agent..." -ForegroundColor Cyan
Set-Location ..\english-tutor-agent

# Check if already running
$agentRunning = Get-NetTCPConnection -LocalPort 11300 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($agentRunning) {
    Write-Host "   ✅ English Tutor Agent is already running (port 11300)" -ForegroundColor Green
} else {
    if (Test-Path "start_agent.ps1") {
        .\start_agent.ps1
        Start-Sleep -Seconds 3
    } else {
        Write-Host "   ⚠️  start_agent.ps1 not found. Starting manually..." -ForegroundColor Yellow
        
        # Manual start
        if (-not (Test-Path "venv")) {
            python -m venv venv
            .\venv\Scripts\Activate.ps1
            pip install -r requirements.txt
        }
        
        $pythonPath = ".\venv\Scripts\python.exe"
        if (-not (Test-Path $pythonPath)) {
            $pythonPath = "python"
        }
        
        $logDir = Join-Path (Get-Location) "logs"
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        
        Start-Process $pythonPath -ArgumentList "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "11300" `
            -WindowStyle Hidden `
            -PassThru `
            -RedirectStandardOutput "$logDir\agent_output.log" `
            -RedirectStandardError "$logDir\agent_error.log" `
            -NoNewWindow
        
        Start-Sleep -Seconds 5
    }
    
    # Check if started
    $agentRunning = Get-NetTCPConnection -LocalPort 11300 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($agentRunning) {
        Write-Host "   ✅ English Tutor Agent started successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  English Tutor Agent may not be running. Check logs." -ForegroundColor Yellow
    }
}
Write-Host ""

# ==================== Check Status ====================
Write-Host "=== Checking Service Status ===" -ForegroundColor Green
Write-Host "=== Đang kiểm tra Trạng thái Services ===" -ForegroundColor Green
Write-Host ""

# PostgreSQL
$postgresStatus = docker compose ps postgres --format json 2>$null | ConvertFrom-Json | Where-Object { $_.State -eq "running" }
if ($postgresStatus) {
    Write-Host "✅ PostgreSQL (port 5433): Running" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL (port 5433): Not running" -ForegroundColor Red
}

# Coqui TTS
$tts = try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11111/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $true
} catch {
    $false
}
if ($tts) {
    Write-Host "✅ Coqui TTS Backend (port 11111): Running" -ForegroundColor Green
} else {
    Write-Host "❌ Coqui TTS Backend (port 11111): Not responding" -ForegroundColor Red
}

# Whisper STT
$stt = try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11210/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $true
} catch {
    $false
}
if ($stt) {
    Write-Host "✅ Whisper STT Backend (port 11210): Running" -ForegroundColor Green
} else {
    Write-Host "❌ Whisper STT Backend (port 11210): Not responding" -ForegroundColor Red
}

# Ollama
$ollama = try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $true
} catch {
    $false
}
if ($ollama) {
    Write-Host "✅ Ollama (port 11434): Running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Ollama (port 11434): Not running (start manually: ollama serve)" -ForegroundColor Yellow
}

# English Tutor Agent
$agent = try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11300/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $true
} catch {
    $false
}
if ($agent) {
    $agentData = $response.Content | ConvertFrom-Json
    Write-Host "✅ English Tutor Agent (port 11300): Running" -ForegroundColor Green
    Write-Host "   Checkpointer: $($agentData.checkpointer)" -ForegroundColor Cyan
} else {
    Write-Host "❌ English Tutor Agent (port 11300): Not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== All Services Started! ===" -ForegroundColor Green
Write-Host "=== Tất cả Services đã được Khởi động! ===" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Cyan
Write-Host "  - PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "  - Coqui TTS Backend: http://127.0.0.1:11111" -ForegroundColor White
Write-Host "  - Whisper STT Backend: http://127.0.0.1:11210" -ForegroundColor White
Write-Host "  - Ollama: http://localhost:11434" -ForegroundColor White
Write-Host "  - English Tutor Agent: http://127.0.0.1:11300" -ForegroundColor White
Write-Host "  - Agent API Docs: http://127.0.0.1:11300/docs" -ForegroundColor White
Write-Host ""

Set-Location $rootDir

