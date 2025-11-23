# Clone virtual environment from VietTTS
# Sao chép môi trường ảo từ VietTTS

Write-Host "🔄 Cloning VietTTS virtual environment..." -ForegroundColor Green
Write-Host "🔄 Đang sao chép môi trường ảo của VietTTS..." -ForegroundColor Green
Write-Host ""

$source_venv = "..\viet-tts\.venv"
$target_venv = ".\.venv"

# Check if source venv exists
# Kiểm tra xem venv nguồn có tồn tại
if (-not (Test-Path $source_venv)) {
    Write-Host "❌ Error: VietTTS venv not found at: $source_venv" -ForegroundColor Red
    Write-Host "❌ Lỗi: Không tìm thấy venv của VietTTS tại: $source_venv" -ForegroundColor Red
    exit 1
}

# Remove existing target venv if it exists
# Xóa venv đích nếu đã tồn tại
if (Test-Path $target_venv) {
    Write-Host "⚠️  Removing existing .venv directory..." -ForegroundColor Yellow
    Write-Host "⚠️  Đang xóa thư mục .venv hiện có..." -ForegroundColor Yellow
    Remove-Item -Path $target_venv -Recurse -Force
    Write-Host "✅ Removed" -ForegroundColor Green
    Write-Host ""
}

# Get size info
# Lấy thông tin kích thước
$source_size = (Get-ChildItem -Path $source_venv -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host "📦 Source venv size: $([math]::Round($source_size, 2)) GB" -ForegroundColor Yellow
Write-Host "📦 Kích thước venv nguồn: $([math]::Round($source_size, 2)) GB" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ Cloning... This may take a few minutes..." -ForegroundColor Yellow
Write-Host "⏳ Đang sao chép... Có thể mất vài phút..." -ForegroundColor Yellow
Write-Host ""

# Clone the venv using robocopy (more reliable than Copy-Item for large directories)
# Sao chép venv bằng robocopy (đáng tin cậy hơn Copy-Item cho thư mục lớn)
# Note: Removed /COPYALL to avoid permission issues with auditing info
# Lưu ý: Đã bỏ /COPYALL để tránh vấn đề quyền với thông tin auditing
$robocopy_args = @(
    $source_venv,
    $target_venv,
    "/E",           # Copy subdirectories including empty ones
    "/COPY:DAT",    # Copy Data, Attributes, Timestamps (no auditing/permissions)
    "/R:3",         # Retry 3 times on failure
    "/W:5",         # Wait 5 seconds between retries
    "/MT:8",        # Use 8 threads for faster copying
    "/NFL",         # No File List
    "/NDL",         # No Directory List
    "/NJH",         # No Job Header
    "/NJS"          # No Job Summary
)

$robocopy_result = Start-Process -FilePath "robocopy" -ArgumentList $robocopy_args -Wait -NoNewWindow -PassThru

# Check if copy was successful (exit codes 0-7 are success)
# Kiểm tra xem việc sao chép có thành công không (exit codes 0-7 là thành công)
if ($robocopy_result.ExitCode -le 7) {
    Write-Host ""
    Write-Host "✅ Virtual environment cloned successfully!" -ForegroundColor Green
    Write-Host "✅ Đã sao chép môi trường ảo thành công!" -ForegroundColor Green
    Write-Host ""
    
    # Verify the clone
    # Xác minh bản sao
    if (Test-Path "$target_venv\Scripts\python.exe") {
        Write-Host "✅ Verification: Python found in cloned venv" -ForegroundColor Green
        Write-Host "✅ Xác minh: Đã tìm thấy Python trong venv đã sao chép" -ForegroundColor Green
        
        # Get Python version
        # Lấy phiên bản Python
        $python_version = & "$target_venv\Scripts\python.exe" --version
        Write-Host "   Python: $python_version" -ForegroundColor White
        
        Write-Host ""
        Write-Host "✅ Setup complete! You can now run the backend:" -ForegroundColor Green
        Write-Host "✅ Cài đặt hoàn tất! Bạn có thể chạy backend:" -ForegroundColor Green
        Write-Host "   .\run.ps1" -ForegroundColor White
    } else {
        Write-Host "⚠️  Warning: Python not found in cloned venv" -ForegroundColor Yellow
        Write-Host "⚠️  Cảnh báo: Không tìm thấy Python trong venv đã sao chép" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ Error cloning virtual environment" -ForegroundColor Red
    Write-Host "❌ Lỗi khi sao chép môi trường ảo" -ForegroundColor Red
    Write-Host "Exit code: $($robocopy_result.ExitCode)" -ForegroundColor Red
    exit 1
}

