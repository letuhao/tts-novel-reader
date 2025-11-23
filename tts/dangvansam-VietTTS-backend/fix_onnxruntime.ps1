# Fix ONNX Runtime Win32 Error
# Sửa lỗi ONNX Runtime Win32

Write-Host "🔧 Fixing ONNX Runtime (Win32 Error Fix)..." -ForegroundColor Cyan
Write-Host "🔧 Đang sửa ONNX Runtime (Sửa lỗi Win32)..." -ForegroundColor Cyan
Write-Host ""

# Stop backend if running
Write-Host "⏹️  Stopping backend (if running)..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.Path -like "*dangvansam-VietTTS-backend*" -or $_.CommandLine -like "*main.py*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Activate venv
$venvPath = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy môi trường ảo!" -ForegroundColor Red
    exit 1
}

$pythonExe = Join-Path $venvPath "Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Python executable not found!" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy Python executable!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found Python: $pythonExe" -ForegroundColor Green
Write-Host ""

# Uninstall onnxruntime-gpu (force)
Write-Host "🗑️  Uninstalling onnxruntime-gpu..." -ForegroundColor Yellow
& $pythonExe -m pip uninstall onnxruntime-gpu -y 2>&1 | Out-Null

# Wait a bit for file locks to release
Start-Sleep -Seconds 2

# Install onnxruntime (CPU version)
Write-Host "📦 Installing onnxruntime (CPU version)..." -ForegroundColor Yellow
& $pythonExe -m pip install onnxruntime==1.16.0 --force-reinstall --no-cache-dir

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ONNX Runtime fixed!" -ForegroundColor Green
    Write-Host "✅ ONNX Runtime đã được sửa!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Testing ONNX Runtime..." -ForegroundColor Cyan
    & $pythonExe -c "import onnxruntime; print(f'✅ ONNX Runtime {onnxruntime.__version__} installed'); print(f'Providers: {onnxruntime.get_available_providers()}')"
    Write-Host ""
    Write-Host "🚀 You can now restart the backend with: .\run.ps1" -ForegroundColor Green
    Write-Host "🚀 Bây giờ bạn có thể khởi động lại backend bằng: .\run.ps1" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to install onnxruntime!" -ForegroundColor Red
    Write-Host "❌ Không thể cài đặt onnxruntime!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try manually:" -ForegroundColor Yellow
    Write-Host "💡 Thử thủ công:" -ForegroundColor Yellow
    Write-Host "   1. Stop the backend completely" -ForegroundColor Yellow
    Write-Host "   2. Run: .\.venv\Scripts\python.exe -m pip uninstall onnxruntime-gpu -y" -ForegroundColor Yellow
    Write-Host "   3. Run: .\.venv\Scripts\python.exe -m pip install onnxruntime==1.16.0" -ForegroundColor Yellow
}

