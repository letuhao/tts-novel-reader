# Setup Coqui TTS Backend
# Cài đặt Coqui TTS Backend

Write-Host "🔧 Setting up Coqui TTS (XTTS-v2) Backend..." -ForegroundColor Green
Write-Host "🔧 Đang cài đặt Coqui TTS (XTTS-v2) Backend..." -ForegroundColor Green
Write-Host ""

# Check if local venv already exists
# Kiểm tra xem venv local đã tồn tại chưa
$local_venv = ".\.venv"

if (Test-Path "$local_venv\Scripts\python.exe") {
    Write-Host "✅ Local venv already exists" -ForegroundColor Green
    Write-Host "✅ Venv local đã tồn tại" -ForegroundColor Green
    Write-Host ""
    Write-Host "Skipping venv creation. If you want to recreate, delete .venv first" -ForegroundColor Yellow
    Write-Host "Bỏ qua việc tạo venv. Nếu bạn muốn tạo lại, xóa .venv trước" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Creating new virtual environment..." -ForegroundColor Yellow
    Write-Host "Đang tạo môi trường ảo mới..." -ForegroundColor Yellow
    Write-Host ""
    
    # Create new venv
    # Tạo venv mới
    python -m venv .venv
    
    if (-not (Test-Path "$local_venv\Scripts\python.exe")) {
        Write-Host "❌ Failed to create venv" -ForegroundColor Red
        Write-Host "❌ Không thể tạo venv" -ForegroundColor Red
        exit 1
    }
}

# Activate local venv
# Kích hoạt venv local
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
Write-Host "Đang kích hoạt môi trường ảo..." -ForegroundColor Yellow
Write-Host ""
.\.venv\Scripts\Activate.ps1

# Upgrade pip
# Nâng cấp pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
Write-Host "Đang nâng cấp pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet

# Install PyTorch with CUDA support (for RTX 4090)
# Cài đặt PyTorch với hỗ trợ CUDA (cho RTX 4090)
Write-Host ""
Write-Host "Installing PyTorch with CUDA support..." -ForegroundColor Yellow
Write-Host "Đang cài đặt PyTorch với hỗ trợ CUDA..." -ForegroundColor Yellow
Write-Host ""
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet

# Install dependencies
# Cài đặt các phụ thuộc
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "Đang cài đặt các phụ thuộc..." -ForegroundColor Yellow
Write-Host ""
pip install -r requirements.txt --quiet

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "✅ Cài đặt hoàn tất!" -ForegroundColor Green
Write-Host ""
Write-Host "Run backend with:" -ForegroundColor Yellow
Write-Host "Chạy backend bằng:" -ForegroundColor Yellow
Write-Host "  .\run.ps1" -ForegroundColor White

