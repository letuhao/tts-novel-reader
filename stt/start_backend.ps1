# Start STT Backend Service
# PowerShell script to start the STT backend service

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "Starting STT Backend Service..." -ForegroundColor Green
Write-Host "Port: 11210" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:11210/docs" -ForegroundColor Cyan
Write-Host ""

# Configure cuDNN for faster-whisper (CTranslate2 needs cuDNN DLLs)
# Cấu hình cuDNN cho faster-whisper (CTranslate2 cần DLL cuDNN)
$cudnnPath = "C:\Program Files\NVIDIA\CUDNN\v9.16"
if (Test-Path $cudnnPath) {
    $cudnnBin = Join-Path $cudnnPath "bin"
    if (Test-Path $cudnnBin) {
        # Add cuDNN bin to PATH for this process
        # Thêm cuDNN bin vào PATH cho tiến trình này
        if ($env:PATH -notlike "*$cudnnBin*") {
            $env:PATH = "$cudnnBin;$env:PATH"
            Write-Host "✅ Added cuDNN v9.16 to PATH" -ForegroundColor Green
            Write-Host "✅ Đã thêm cuDNN v9.16 vào PATH" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  cuDNN v9.16 already in PATH" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  cuDNN bin directory not found: $cudnnBin" -ForegroundColor Yellow
    }
} else {
    # Try cuDNN v8.9.7.29 as fallback
    $cudnnPath = "C:\Program Files\NVIDIA\CUDNN\v8.9.7.29"
    if (Test-Path $cudnnPath) {
        $cudnnBin = Join-Path $cudnnPath "bin"
        if (Test-Path $cudnnBin) {
            if ($env:PATH -notlike "*$cudnnBin*") {
                $env:PATH = "$cudnnBin;$env:PATH"
                Write-Host "✅ Added cuDNN v8.9.7.29 to PATH (fallback)" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "⚠️  cuDNN not found. GPU acceleration may not work." -ForegroundColor Yellow
        Write-Host "   Expected locations:" -ForegroundColor Yellow
        Write-Host "   - C:\Program Files\NVIDIA\CUDNN\v9.16\bin" -ForegroundColor Yellow
        Write-Host "   - C:\Program Files\NVIDIA\CUDNN\v8.9.7.29\bin" -ForegroundColor Yellow
    }
}

Write-Host ""

# Start uvicorn
python -m uvicorn main:app `
    --host 0.0.0.0 `
    --port 11210 `
    --log-level info

