# Stop English Tutor Agent Service
# Dừng Dịch vụ English Tutor Agent

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Stopping English Tutor Agent..." -ForegroundColor Yellow
Write-Host "Đang dừng English Tutor Agent..." -ForegroundColor Yellow

# Try to get process from PID file
$logDir = Join-Path $scriptDir "logs"
$pidFile = Join-Path $logDir "agent_pid.txt"

if (Test-Path $pidFile) {
    $pid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($pid) {
        try {
            $process = Get-Process -Id $pid -ErrorAction Stop
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "✅ Stopped agent process $pid" -ForegroundColor Green
            Write-Host "✅ Đã dừng agent process $pid" -ForegroundColor Green
            Remove-Item $pidFile -Force
        } catch {
            Write-Host "⚠️  Process $pid not found or already stopped" -ForegroundColor Yellow
        }
    }
}

# Also try to stop by port
$processOnPort = Get-NetTCPConnection -LocalPort 11300 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processOnPort) {
    try {
        Stop-Process -Id $processOnPort -Force -ErrorAction Stop
        Write-Host "✅ Stopped process on port 11300: $processOnPort" -ForegroundColor Green
        Write-Host "✅ Đã dừng process trên port 11300: $processOnPort" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not stop process: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  No process found on port 11300" -ForegroundColor Gray
    Write-Host "ℹ️  Không tìm thấy process nào trên port 11300" -ForegroundColor Gray
}

Write-Host ""

