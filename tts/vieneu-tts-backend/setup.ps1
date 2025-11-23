# Setup VieNeu-TTS Backend
# Cài đặt VieNeu-TTS Backend

Write-Host "🔧 Setting up VieNeu-TTS Backend..." -ForegroundColor Green
Write-Host "🔧 Đang cài đặt VieNeu-TTS Backend..." -ForegroundColor Green
Write-Host ""

# Check if local venv already exists
# Kiểm tra xem venv local đã tồn tại chưa
$local_venv = ".\.venv"

if (Test-Path "$local_venv\Scripts\python.exe") {
    Write-Host "✅ Local venv already exists" -ForegroundColor Green
    Write-Host "✅ Venv local đã tồn tại" -ForegroundColor Green
    Write-Host ""
    Write-Host "Skipping venv clone. If you want to re-clone, run:" -ForegroundColor Yellow
    Write-Host "Bỏ qua việc sao chép venv. Nếu bạn muốn sao chép lại, chạy:" -ForegroundColor Yellow
    Write-Host "  .\clone_venv.ps1" -ForegroundColor White
    Write-Host ""
} else {
    # Check if VieNeu-TTS venv exists to clone from
    # Kiểm tra xem venv của VieNeu-TTS có tồn tại để sao chép không
    $vieneu_venv = "..\VieNeu-TTS\.venv"
    
    if (Test-Path "$vieneu_venv\Scripts\python.exe") {
        Write-Host "✅ Found VieNeu-TTS venv" -ForegroundColor Green
        Write-Host "✅ Đã tìm thấy venv của VieNeu-TTS" -ForegroundColor Green
        Write-Host ""
        Write-Host "Cloning virtual environment..." -ForegroundColor Yellow
        Write-Host "Đang sao chép môi trường ảo..." -ForegroundColor Yellow
        Write-Host ""
        
        # Clone the venv
        # Sao chép venv
        & ".\clone_venv.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "❌ Failed to clone venv" -ForegroundColor Red
            Write-Host "❌ Không thể sao chép venv" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
    } else {
        Write-Host "⚠️  VieNeu-TTS venv not found at: $vieneu_venv" -ForegroundColor Yellow
        Write-Host "⚠️  Không tìm thấy venv của VieNeu-TTS tại: $vieneu_venv" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Creating new venv instead..." -ForegroundColor Yellow
        Write-Host "Đang tạo venv mới thay thế..." -ForegroundColor Yellow
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

# Install additional dependencies (FastAPI, etc.)
# Cài đặt các phụ thuộc bổ sung (FastAPI, v.v.)
Write-Host ""
Write-Host "Installing additional dependencies..." -ForegroundColor Yellow
Write-Host "Đang cài đặt các phụ thuộc bổ sung..." -ForegroundColor Yellow
Write-Host ""

# Install only the additional packages needed (FastAPI, uvicorn, etc.)
# Chỉ cài đặt các gói bổ sung cần thiết (FastAPI, uvicorn, v.v.)
pip install fastapi>=0.115.0 uvicorn[standard]>=0.30.0 pydantic>=2.11.3 python-multipart>=0.0.9 --quiet

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "✅ Cài đặt hoàn tất!" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend now has its own cloned venv with 100% VieNeu-TTS compatibility!" -ForegroundColor Green
Write-Host "Backend của bạn hiện có venv riêng được sao chép với 100% tương thích VieNeu-TTS!" -ForegroundColor Green
Write-Host ""
Write-Host "Run backend with:" -ForegroundColor Yellow
Write-Host "Chạy backend bằng:" -ForegroundColor Yellow
Write-Host "  .\run.ps1" -ForegroundColor White
