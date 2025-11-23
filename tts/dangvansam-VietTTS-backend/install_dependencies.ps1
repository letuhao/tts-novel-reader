# Install Dependencies for DangVanSam VietTTS Backend
# Cài đặt Phụ thuộc cho DangVanSam VietTTS Backend

Write-Host "📦 Installing dependencies..." -ForegroundColor Green
Write-Host "📦 Đang cài đặt phụ thuộc..." -ForegroundColor Green
Write-Host ""

# Check if venv exists
$local_venv = ".\.venv\Scripts\python.exe"

if (-not (Test-Path $local_venv)) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "❌ Không tìm thấy môi trường ảo!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run setup first:" -ForegroundColor Yellow
    Write-Host "Vui lòng chạy setup trước:" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1" -ForegroundColor White
    exit 1
}

# Activate venv
.\.venv\Scripts\Activate.ps1

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet

# Install dependencies
if (Test-Path "requirements.txt") {
    Write-Host ""
    Write-Host "Installing from requirements.txt (this may take a few minutes)..." -ForegroundColor Yellow
    Write-Host "Đang cài đặt từ requirements.txt (có thể mất vài phút)..." -ForegroundColor Yellow
    Write-Host ""
    pip install -r requirements.txt
    Write-Host ""
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
    Write-Host "✅ Đã cài đặt phụ thuộc!" -ForegroundColor Green
} else {
    Write-Host "❌ requirements.txt not found!" -ForegroundColor Red
    exit 1
}

