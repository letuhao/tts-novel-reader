# Run TTS Backend Service in Background
# Chạy Dịch vụ TTS Backend ở Chế độ Nền

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Add uv to PATH
$env:Path = "C:\Users\NeneScarlet\.local\bin;$env:Path"

# Activate virtual environment
& "\.venv\Scripts\Activate.ps1"

# Run backend in background
Start-Process python -ArgumentList "main.py" -WindowStyle Hidden -WorkingDirectory $scriptDir

Write-Host "✅ TTS Backend started in background" -ForegroundColor Green
Write-Host "✅ Dịch vụ TTS Backend đã được khởi động ở chế độ nền" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Backend running at: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop the backend, find the Python process and kill it." -ForegroundColor Yellow
Write-Host "Để dừng backend, tìm process Python và kill nó." -ForegroundColor Yellow

