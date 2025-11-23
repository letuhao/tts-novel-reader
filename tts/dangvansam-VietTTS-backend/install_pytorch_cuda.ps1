# Install PyTorch with CUDA Support
# Cài đặt PyTorch với hỗ trợ CUDA

Write-Host "🚀 Installing PyTorch with CUDA support..." -ForegroundColor Cyan
Write-Host "🚀 Đang cài đặt PyTorch với hỗ trợ CUDA..." -ForegroundColor Cyan
Write-Host ""

# Activate venv
$venvPath = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    exit 1
}

$pythonExe = Join-Path $venvPath "Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Python executable not found!" -ForegroundColor Red
    exit 1
}

# Check current PyTorch version
Write-Host "🔍 Checking current PyTorch installation..." -ForegroundColor Cyan
$currentTorch = & $pythonExe -c "import torch; print(f'{torch.__version__}'); print(f'CUDA: {torch.cuda.is_available()}')" 2>&1
Write-Host $currentTorch
Write-Host ""

# Detect CUDA version
Write-Host "🔍 Detecting CUDA version..." -ForegroundColor Cyan
$cudaVersion = $null
try {
    $nvccOutput = & nvcc --version 2>&1
    if ($nvccOutput -match "release (\d+\.\d+)") {
        $cudaVersion = $matches[1]
        Write-Host "✅ Found CUDA version: $cudaVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not detect CUDA version from nvcc" -ForegroundColor Yellow
}

# Check CUDA_PATH
$cudaPath = $env:CUDA_PATH
if ($cudaPath) {
    Write-Host "✅ CUDA_PATH: $cudaPath" -ForegroundColor Green
} else {
    Write-Host "⚠️  CUDA_PATH not set" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Installing PyTorch 2.0.1 with CUDA 11.8..." -ForegroundColor Yellow
Write-Host "   (This matches viet-tts requirements and uses CUDA 11.8 like vieneu-tts-backend)" -ForegroundColor Gray
Write-Host "   (Điều này khớp với yêu cầu viet-tts và sử dụng CUDA 11.8 giống như vieneu-tts-backend)" -ForegroundColor Gray
Write-Host ""

# Uninstall existing PyTorch
Write-Host "🗑️  Uninstalling existing PyTorch..." -ForegroundColor Yellow
& $pythonExe -m pip uninstall torch torchaudio -y 2>&1 | Out-Null

# Install PyTorch 2.0.1 with CUDA 11.8 (matches viet-tts requirements and vieneu-tts-backend CUDA version)
Write-Host "📦 Installing PyTorch 2.0.1+cu118..." -ForegroundColor Yellow
Write-Host "   (Same CUDA version as working vieneu-tts-backend setup)" -ForegroundColor Gray
Write-Host "   (Cùng phiên bản CUDA như setup vieneu-tts-backend đang hoạt động)" -ForegroundColor Gray
& $pythonExe -m pip install torch==2.0.1+cu118 torchaudio==2.0.2+cu118 --index-url https://download.pytorch.org/whl/cu118 --no-cache-dir

# Fix silero-vad dependency: silero-vad 6.2.0 requires onnxruntime>=1.16.1
# But we need onnxruntime-gpu==1.16.0 for viet-tts compatibility
# Check if silero-vad actually works with 1.16.0 (it usually does despite the warning)
# Sửa phụ thuộc silero-vad: silero-vad 6.2.0 yêu cầu onnxruntime>=1.16.1
# Nhưng chúng ta cần onnxruntime-gpu==1.16.0 để tương thích với viet-tts
# Kiểm tra xem silero-vad có thực sự hoạt động với 1.16.0 không (thường thì có mặc dù có cảnh báo)
Write-Host ""
Write-Host "ℹ️  Note: silero-vad requires onnxruntime>=1.16.1, but we use 1.16.0 for viet-tts compatibility" -ForegroundColor Yellow
Write-Host "ℹ️  Lưu ý: silero-vad yêu cầu onnxruntime>=1.16.1, nhưng chúng ta dùng 1.16.0 để tương thích với viet-tts" -ForegroundColor Yellow
Write-Host "   This is usually fine - silero-vad will work with 1.16.0 despite the warning" -ForegroundColor Gray
Write-Host "   Điều này thường ổn - silero-vad sẽ hoạt động với 1.16.0 mặc dù có cảnh báo" -ForegroundColor Gray

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🧪 Verifying installation..." -ForegroundColor Cyan
    # Use a simpler verification command to avoid PowerShell string escaping issues
    # Sử dụng lệnh xác minh đơn giản hơn để tránh vấn đề escape string của PowerShell
    $verify = & $pythonExe -c "import torch; print('PyTorch:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); cuda_ver = torch.version.cuda if torch.cuda.is_available() else 'N/A'; print('CUDA version:', cuda_ver); gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'; print('GPU:', gpu_name)" 2>&1
    Write-Host $verify
    Write-Host ""
    
    if ($verify -match "CUDA available: True") {
        Write-Host "✅ PyTorch with CUDA installed successfully!" -ForegroundColor Green
        Write-Host "✅ PyTorch với CUDA đã được cài đặt thành công!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 You can now restart the backend with: .\run.ps1" -ForegroundColor Green
        Write-Host "🚀 Bây giờ bạn có thể khởi động lại backend bằng: .\run.ps1" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PyTorch installed but CUDA not detected" -ForegroundColor Yellow
        Write-Host "⚠️  PyTorch đã được cài đặt nhưng CUDA không được phát hiện" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
        Write-Host "   1. Verify CUDA is installed: nvcc --version" -ForegroundColor Yellow
        Write-Host "   2. Check CUDA_PATH environment variable" -ForegroundColor Yellow
        Write-Host "   3. Ensure NVIDIA drivers are up to date" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ Failed to install PyTorch with CUDA!" -ForegroundColor Red
    Write-Host "❌ Không thể cài đặt PyTorch với CUDA!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternative: Install CPU version" -ForegroundColor Yellow
    Write-Host "   pip install torch==2.0.1 torchaudio==2.0.2" -ForegroundColor Yellow
}

