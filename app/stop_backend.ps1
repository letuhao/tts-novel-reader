# Stop TTS Backend Service
# Dừng Dịch vụ TTS Backend

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $scriptDir "logs"

# Method 1: Find by port 11111 (most reliable)
Write-Host "Stopping TTS Backend..." -ForegroundColor Yellow
Write-Host "Đang dừng TTS Backend..." -ForegroundColor Yellow

$processes = @()

# Find process using port 11111
$portProcess = Get-NetTCPConnection -LocalPort 11111 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($portProcess) {
    $processes += $portProcess
}

# Method 2: Find by PID file
$pidFile = Join-Path $logDir "backend_pid.txt"
if (Test-Path $pidFile) {
    $savedPid = Get-Content $pidFile -Raw | ForEach-Object { [int]$_.Trim() }
    if ($savedPid) {
        try {
            $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
            if ($proc) {
                $processes += $savedPid
            }
        } catch {
            # Process not found, that's ok
        }
    }
}

# Remove duplicates
$processes = $processes | Select-Object -Unique

if ($processes) {
    foreach ($pid in $processes) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            Write-Host "   Stopping process $pid ($($proc.ProcessName))..." -ForegroundColor Gray
            Stop-Process -Id $pid -Force
            Write-Host "   ✅ Stopped process $pid" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Failed to stop process $pid : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Clean up PID file
    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host ""
    Write-Host "✅ TTS Backend stopped" -ForegroundColor Green
    Write-Host "✅ TTS Backend đã được dừng" -ForegroundColor Green
} else {
    Write-Host "No TTS Backend process found on port 11111" -ForegroundColor Yellow
    Write-Host "Không tìm thấy process TTS Backend trên port 11111" -ForegroundColor Yellow
}
