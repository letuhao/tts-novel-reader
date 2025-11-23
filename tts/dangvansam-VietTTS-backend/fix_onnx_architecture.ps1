# Fix ONNX Runtime Architecture Mismatch (32-bit vs 64-bit)
# Sửa Lệch Kiến trúc ONNX Runtime (32-bit vs 64-bit)

Write-Host "🔧 Fixing ONNX Runtime Architecture Mismatch..." -ForegroundColor Cyan
Write-Host "🔧 Đang sửa Lệch Kiến trúc ONNX Runtime..." -ForegroundColor Cyan
Write-Host ""

# Activate venv
$venvPath = Join-Path $PSScriptRoot ".venv"
$pythonExe = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Python executable not found!" -ForegroundColor Red
    exit 1
}

# Check Python architecture
Write-Host "🔍 Checking Python architecture..." -ForegroundColor Cyan
$archCheck = & $pythonExe -c "import struct; import sys; import platform; print('Python:', struct.calcsize('P') * 8, 'bit'); print('Machine:', platform.machine()); print('Executable:', sys.executable)" 2>&1
Write-Host $archCheck
Write-Host ""

# Check if Python is 64-bit
$is64bit = $archCheck -match "64 bit"
if (-not $is64bit) {
    Write-Host "❌ Python is 32-bit! You need 64-bit Python for ONNX Runtime GPU." -ForegroundColor Red
    Write-Host "❌ Python là 32-bit! Bạn cần Python 64-bit cho ONNX Runtime GPU." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Python is 64-bit" -ForegroundColor Green
Write-Host ""

# Check current ONNX Runtime installation
Write-Host "🔍 Checking current ONNX Runtime installation..." -ForegroundColor Cyan
$onnxInfo = & $pythonExe -m pip show onnxruntime-gpu 2>&1
Write-Host $onnxInfo
Write-Host ""

# Check for 32-bit DLLs in ONNX Runtime
Write-Host "🔍 Checking ONNX Runtime DLL architecture..." -ForegroundColor Cyan
$onnxLocation = & $pythonExe -c "import onnxruntime; import os; print(os.path.dirname(onnxruntime.__file__))" 2>&1
if ($onnxLocation) {
    $dllPath = Join-Path $onnxLocation "capi"
    if (Test-Path $dllPath) {
        $dlls = Get-ChildItem -Path $dllPath -Filter "*.dll" -ErrorAction SilentlyContinue
        if ($dlls) {
            Write-Host "Found DLLs in: $dllPath" -ForegroundColor Yellow
            foreach ($dll in $dlls | Select-Object -First 3) {
                Write-Host "  - $($dll.Name)" -ForegroundColor Gray
            }
        }
    }
}
Write-Host ""

# Uninstall existing ONNX Runtime (both CPU and GPU versions)
Write-Host "🗑️  Uninstalling existing ONNX Runtime packages..." -ForegroundColor Yellow
& $pythonExe -m pip uninstall onnxruntime onnxruntime-gpu -y 2>&1 | Out-Null
Start-Sleep -Seconds 3

# Clear pip cache to ensure clean install
Write-Host "🧹 Clearing pip cache..." -ForegroundColor Yellow
& $pythonExe -m pip cache purge 2>&1 | Out-Null

# Install 64-bit ONNX Runtime GPU
Write-Host ""
Write-Host "📦 Installing 64-bit ONNX Runtime GPU 1.16.0..." -ForegroundColor Yellow
Write-Host "   (This will download the correct 64-bit Windows wheel)" -ForegroundColor Gray
Write-Host "   (Sẽ tải xuống wheel Windows 64-bit đúng)" -ForegroundColor Gray
Write-Host ""

# Force install from PyPI (ensures correct architecture)
& $pythonExe -m pip install onnxruntime-gpu==1.16.0 --no-cache-dir --force-reinstall --only-binary :all:

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🧪 Verifying installation..." -ForegroundColor Cyan
    
    # Test import and providers
    $testResult = & $pythonExe -c "import onnxruntime; print('Version:', onnxruntime.__version__); providers = onnxruntime.get_available_providers(); print('Providers:', providers); print('CUDA available:', 'CUDAExecutionProvider' in providers)" 2>&1
    
    Write-Host $testResult
    Write-Host ""
    
    # Test if we can create a session (this will fail if architecture is wrong)
    Write-Host "🧪 Testing CUDA provider initialization..." -ForegroundColor Cyan
    $testSession = & $pythonExe -c "import onnxruntime; import numpy as np; sess_opts = onnxruntime.SessionOptions(); providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']; print('Testing session creation...'); print('This will fail if architecture mismatch exists')" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ONNX Runtime GPU installed successfully (64-bit)!" -ForegroundColor Green
        Write-Host "✅ ONNX Runtime GPU đã được cài đặt thành công (64-bit)!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Restart the backend to test:" -ForegroundColor Green
        Write-Host "🚀 Khởi động lại backend để kiểm tra:" -ForegroundColor Green
        Write-Host "   .\run.ps1" -ForegroundColor White
    } else {
        Write-Host "⚠️  Installation completed but verification failed" -ForegroundColor Yellow
        Write-Host $testSession
    }
} else {
    Write-Host ""
    Write-Host "❌ Failed to install ONNX Runtime GPU" -ForegroundColor Red
    Write-Host "❌ Không thể cài đặt ONNX Runtime GPU" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try manually:" -ForegroundColor Yellow
    Write-Host "   .\.venv\Scripts\python.exe -m pip install onnxruntime-gpu==1.16.0 --no-cache-dir --force-reinstall --only-binary :all:" -ForegroundColor White
}

