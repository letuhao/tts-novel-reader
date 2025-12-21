# Stop STT Backend Service
# PowerShell script to stop the STT backend service

Write-Host "Stopping STT Backend Service..." -ForegroundColor Yellow

# Find and stop processes running on port 11210
$processes = Get-NetTCPConnection -LocalPort 11210 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($pid in $processes) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -like "*python*") {
            Write-Host "Stopping process: $($proc.ProcessName) (PID: $pid)" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "STT Backend Service stopped." -ForegroundColor Green
} else {
    Write-Host "No STT Backend Service found running on port 11210." -ForegroundColor Gray
}

