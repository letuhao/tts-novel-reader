# Install CUDA-enabled PyTorch in the cloned venv
# Cài đặt PyTorch hỗ trợ CUDA trong venv đã sao chép

Write-Host "🔧 Installing CUDA-enabled PyTorch..." -ForegroundColor Green
Write-Host "🔧 Đang cài đặt PyTorch hỗ trợ CUDA..." -ForegroundColor Green
Write-Host ""

# Check if CUDA is available on system
# Kiểm tra xem CUDA có khả dụng trên hệ thống không
Write-Host "Checking CUDA availability..." -ForegroundColor Yellow
Write-Host "Đang kiểm tra khả dụng CUDA..." -ForegroundColor Yellow

try {
    $nvidia = nvidia-smi --query-gpu=name,driver_version --format=csv,noheader 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ NVIDIA GPU detected:" -ForegroundColor Green
        Write-Host "✅ Đã phát hiện NVIDIA GPU:" -ForegroundColor Green
        $nvidia | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
        Write-Host ""
    } else {
        Write-Host "⚠️  NVIDIA GPU not detected or nvidia-smi not found" -ForegroundColor Yellow
        Write-Host "⚠️  Không phát hiện NVIDIA GPU hoặc không tìm thấy nvidia-smi" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Do you still want to install CUDA PyTorch? (y/n)" -ForegroundColor Yellow
        Write-Host "Bạn vẫn muốn cài đặt PyTorch CUDA? (y/n)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "Cancelled." -ForegroundColor Yellow
            Write-Host "Đã hủy." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "⚠️  Could not check NVIDIA GPU: $_" -ForegroundColor Yellow
    Write-Host "⚠️  Không thể kiểm tra NVIDIA GPU: $_" -ForegroundColor Yellow
}

# Check for venv
# Kiểm tra venv
$venv_python = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $venv_python)) {
    Write-Host "❌ Virtual environment not found at: .venv" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy môi trường ảo tại: .venv" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run setup first:" -ForegroundColor Yellow
    Write-Host "Vui lòng chạy setup trước:" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1" -ForegroundColor White
    exit 1
}

# Use venv Python directly (more reliable than activating)
# Sử dụng Python của venv trực tiếp (đáng tin cậy hơn việc kích hoạt)
$python = Resolve-Path $venv_python

Write-Host "Using Python: $python" -ForegroundColor Yellow
Write-Host "Sử dụng Python: $python" -ForegroundColor Yellow
Write-Host ""

# Check current PyTorch version
# Kiểm tra phiên bản PyTorch hiện tại
Write-Host "Checking current PyTorch version..." -ForegroundColor Yellow
Write-Host "Đang kiểm tra phiên bản PyTorch hiện tại..." -ForegroundColor Yellow
& $python -c "import torch; print('Current PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"
Write-Host ""

Write-Host "Uninstalling CPU-only PyTorch..." -ForegroundColor Yellow
Write-Host "Đang gỡ cài đặt PyTorch chỉ CPU..." -ForegroundColor Yellow
& $python -m pip uninstall -y torch torchvision torchaudio 2>&1 | Out-Null

Write-Host ""
Write-Host "Installing CUDA 11.8 PyTorch..." -ForegroundColor Yellow
Write-Host "Đang cài đặt PyTorch CUDA 11.8..." -ForegroundColor Yellow
Write-Host ""
Write-Host "This may take a few minutes (~2-3GB download)..." -ForegroundColor Yellow
Write-Host "Có thể mất vài phút (~2-3GB tải xuống)..." -ForegroundColor Yellow
Write-Host ""

# Install CUDA 11.8 version (compatible with most GPUs)
# Cài đặt phiên bản CUDA 11.8 (tương thích với hầu hết GPU)
& $python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ CUDA PyTorch installed successfully!" -ForegroundColor Green
    Write-Host "✅ Đã cài đặt PyTorch CUDA thành công!" -ForegroundColor Green
    Write-Host ""
    
    # Verify installation
    # Xác minh cài đặt
    Write-Host ""
    Write-Host "Verifying CUDA installation..." -ForegroundColor Yellow
    Write-Host "Đang xác minh cài đặt CUDA..." -ForegroundColor Yellow
    & $python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); print('CUDA version:', torch.version.cuda if torch.cuda.is_available() else 'N/A'); print('GPU count:', torch.cuda.device_count() if torch.cuda.is_available() else 0); print('GPU name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Installation complete! Backend will now use GPU." -ForegroundColor Green
        Write-Host "✅ Cài đặt hoàn tất! Backend sẽ sử dụng GPU." -ForegroundColor Green
        Write-Host ""
        Write-Host "Run backend with:" -ForegroundColor Yellow
        Write-Host "Chạy backend bằng:" -ForegroundColor Yellow
        Write-Host "  .\run.ps1" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "❌ Failed to install CUDA PyTorch" -ForegroundColor Red
    Write-Host "❌ Không thể cài đặt PyTorch CUDA" -ForegroundColor Red
    Write-Host ""
    Write-Host "You can try installing manually:" -ForegroundColor Yellow
    Write-Host "Bạn có thể thử cài đặt thủ công:" -ForegroundColor Yellow
    Write-Host "  .\.venv\Scripts\python.exe -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118" -ForegroundColor White
    exit 1
}

