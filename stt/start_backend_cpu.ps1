# Start STT Backend Service (CPU Mode)
# PowerShell script to start the STT backend service with CPU fallback

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "Starting STT Backend Service (CPU Mode)..." -ForegroundColor Green
Write-Host "Port: 11210" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:11210/docs" -ForegroundColor Cyan

# Set CPU mode
$env:STT_DEVICE = "cpu"
$env:STT_COMPUTE_TYPE = "int8"

# Start uvicorn
python -m uvicorn main:app `
    --host 0.0.0.0 `
    --port 11210 `
    --log-level info

