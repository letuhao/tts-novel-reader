# Setup GPU Version for VietTTS Backend
# Thiết lập phiên bản GPU cho VietTTS Backend

Write-Host "🚀 Setting up GPU version for VietTTS Backend..." -ForegroundColor Cyan
Write-Host "🚀 Đang thiết lập phiên bản GPU cho VietTTS Backend..." -ForegroundColor Cyan
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

# Check CUDA availability
Write-Host "🔍 Checking CUDA availability..." -ForegroundColor Cyan
$cudaCheck = & $pythonExe -c "import torch; print('CUDA_AVAILABLE:', torch.cuda.is_available()); print('CUDA_VERSION:', torch.version.cuda if torch.cuda.is_available() else 'N/A')" 2>&1
Write-Host $cudaCheck
if ($cudaCheck -match "CUDA_AVAILABLE: False") {
    Write-Host "⚠️  CUDA not available in PyTorch!" -ForegroundColor Yellow
    Write-Host "⚠️  CUDA không khả dụng trong PyTorch!" -ForegroundColor Yellow
    Write-Host "   Make sure you have PyTorch with CUDA support installed" -ForegroundColor Yellow
    Write-Host "   Đảm bảo bạn đã cài đặt PyTorch với hỗ trợ CUDA" -ForegroundColor Yellow
}
Write-Host ""

# Step 1: Uninstall existing onnxruntime packages
Write-Host "🗑️  Step 1: Uninstalling existing ONNX Runtime packages..." -ForegroundColor Yellow
& $pythonExe -m pip uninstall onnxruntime onnxruntime-gpu -y 2>&1 | Out-Null
Start-Sleep -Seconds 2

# Step 2: Install NumPy <2.0.0 FIRST (required for onnxruntime 1.16.0)
Write-Host "📦 Step 2: Installing NumPy <2.0.0 (required for onnxruntime 1.16.0)..." -ForegroundColor Yellow
& $pythonExe -m pip install "numpy>=1.21.6,<2.0.0" --force-reinstall --no-cache-dir
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install NumPy!" -ForegroundColor Red
    exit 1
}

# Step 3: Install onnxruntime-gpu
Write-Host "📦 Step 3: Installing onnxruntime-gpu==1.16.0..." -ForegroundColor Yellow
& $pythonExe -m pip install onnxruntime-gpu==1.16.0 --no-cache-dir
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install onnxruntime-gpu!" -ForegroundColor Red
    Write-Host "💡 This might be due to CUDA/cuDNN compatibility issues" -ForegroundColor Yellow
    Write-Host "💡 Điều này có thể do vấn đề tương thích CUDA/cuDNN" -ForegroundColor Yellow
    exit 1
}

# Step 4: Verify installation
Write-Host ""
Write-Host "🧪 Step 4: Verifying installation..." -ForegroundColor Cyan
$testResult = & $pythonExe -c "import onnxruntime; print('Version:', onnxruntime.__version__); print('Providers:', onnxruntime.get_available_providers())" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $testResult
    Write-Host ""
    
    if ($testResult -match "CUDAExecutionProvider") {
        Write-Host "✅ GPU support enabled! CUDAExecutionProvider is available" -ForegroundColor Green
        Write-Host "✅ Hỗ trợ GPU đã bật! CUDAExecutionProvider có sẵn" -ForegroundColor Green
    } else {
        Write-Host "⚠️  GPU support not detected, but CPU will work" -ForegroundColor Yellow
        Write-Host "⚠️  Hỗ trợ GPU không được phát hiện, nhưng CPU sẽ hoạt động" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✅ GPU setup completed successfully!" -ForegroundColor Green
    Write-Host "✅ Thiết lập GPU hoàn tất thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 You can now restart the backend with: .\run.ps1" -ForegroundColor Green
    Write-Host "🚀 Bây giờ bạn có thể khởi động lại backend bằng: .\run.ps1" -ForegroundColor Green
} else {
    Write-Host "❌ Verification failed!" -ForegroundColor Red
    Write-Host $testResult
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check CUDA/cuDNN installation" -ForegroundColor Yellow
    Write-Host "   2. Verify CUDA_PATH environment variable" -ForegroundColor Yellow
    Write-Host "   3. Try: pip install onnxruntime-gpu==1.16.0 --no-cache-dir" -ForegroundColor Yellow
}

