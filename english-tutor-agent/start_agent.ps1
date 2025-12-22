# Start English Tutor Agent Service
# Khởi động Dịch vụ English Tutor Agent

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if agent is already running
$existingProcess = Get-NetTCPConnection -LocalPort 11300 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($existingProcess) {
    Write-Host "⚠️  Agent is already running on port 11300!" -ForegroundColor Yellow
    Write-Host "⚠️  Agent đang chạy trên port 11300 rồi!" -ForegroundColor Yellow
    Write-Host "   Process ID: $existingProcess" -ForegroundColor Cyan
    Write-Host "   Stop it first with: .\stop_agent.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting English Tutor Agent in background..." -ForegroundColor Cyan
Write-Host "Đang khởi động English Tutor Agent ở chế độ nền..." -ForegroundColor Cyan

# Create log directory if it doesn't exist
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Check if Python virtual environment exists
$venvPath = Join-Path $scriptDir "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "⚠️  Virtual environment not found. Creating..." -ForegroundColor Yellow
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
} else {
    # Get Python path from venv
    $pythonPath = Join-Path $scriptDir "venv\Scripts\python.exe"
    if (-not (Test-Path $pythonPath)) {
        $pythonPath = "python"
    }
}

# Start process in background with logs redirected
$process = Start-Process $pythonPath -ArgumentList "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "11300" `
    -WindowStyle Hidden `
    -WorkingDirectory $scriptDir `
    -PassThru `
    -RedirectStandardOutput "$logDir\agent_output.log" `
    -RedirectStandardError "$logDir\agent_error.log" `
    -NoNewWindow

# Save process ID
$pidFile = Join-Path $logDir "agent_pid.txt"
$process.Id | Out-File -FilePath $pidFile -Encoding UTF8

# Wait a moment for it to start
Start-Sleep -Seconds 5

# Check if it's running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11300/health" -TimeoutSec 3 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Agent started successfully!" -ForegroundColor Green
        Write-Host "✅ Agent đã được khởi động thành công!" -ForegroundColor Green
        Write-Host "   Process ID: $($process.Id)" -ForegroundColor Cyan
        Write-Host "   URL: http://127.0.0.1:11300" -ForegroundColor Cyan
        Write-Host "   API Docs: http://127.0.0.1:11300/docs" -ForegroundColor Cyan
        Write-Host "   Health: http://127.0.0.1:11300/health" -ForegroundColor Cyan
        Write-Host "   Logs: $logDir" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Agent started but health check failed. Check logs: $logDir" -ForegroundColor Yellow
    Write-Host "⚠️  Agent đã khởi động nhưng health check thất bại. Kiểm tra logs: $logDir" -ForegroundColor Yellow
}

Write-Host ""

