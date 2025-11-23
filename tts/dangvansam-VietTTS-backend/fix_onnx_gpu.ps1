# Fix ONNX Runtime GPU DLL Loading Issue
# Sửa vấn đề tải DLL ONNX Runtime GPU

Write-Host "🔧 Fixing ONNX Runtime GPU DLL loading..." -ForegroundColor Cyan
Write-Host "🔧 Đang sửa vấn đề tải DLL ONNX Runtime GPU..." -ForegroundColor Cyan
Write-Host ""

# Activate venv
$venvPath = Join-Path $PSScriptRoot ".venv"
$pythonExe = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Python executable not found!" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Checking ONNX Runtime installation..." -ForegroundColor Cyan
$onnxCheck = & $pythonExe -c "import onnxruntime; print('Version:', onnxruntime.__version__); print('Providers:', onnxruntime.get_available_providers())" 2>&1
Write-Host $onnxCheck
Write-Host ""

# Check CUDA DLLs
Write-Host "🔍 Checking CUDA DLLs..." -ForegroundColor Cyan
$cudaPath = $env:CUDA_PATH
if ($cudaPath) {
    Write-Host "✅ CUDA_PATH: $cudaPath" -ForegroundColor Green
    
    # Check for required CUDA DLLs
    $cudaDlls = @(
        "$cudaPath\bin\cudart64_*.dll",
        "$cudaPath\bin\cublas64_*.dll",
        "$cudaPath\bin\curand64_*.dll",
        "$cudaPath\bin\cusolver64_*.dll",
        "$cudaPath\bin\cusparse64_*.dll",
        "$cudaPath\bin\cufft64_*.dll"
    )
    
    $foundDlls = 0
    foreach ($pattern in $cudaDlls) {
        $dlls = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
        if ($dlls) {
            $foundDlls++
        }
    }
    
    if ($foundDlls -gt 0) {
        Write-Host "✅ Found CUDA DLLs in CUDA_PATH" -ForegroundColor Green
    } else {
        Write-Host "⚠️  CUDA DLLs not found in CUDA_PATH/bin" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  CUDA_PATH not set" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Reinstalling onnxruntime-gpu to fix DLL issues..." -ForegroundColor Yellow
Write-Host "🔧 Đang cài đặt lại onnxruntime-gpu để sửa vấn đề DLL..." -ForegroundColor Yellow

# Uninstall and reinstall
& $pythonExe -m pip uninstall onnxruntime onnxruntime-gpu -y 2>&1 | Out-Null
Start-Sleep -Seconds 2

# Reinstall with force
Write-Host "📦 Installing onnxruntime-gpu==1.16.0..." -ForegroundColor Yellow
& $pythonExe -m pip install onnxruntime-gpu==1.16.0 --force-reinstall --no-cache-dir

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🧪 Testing ONNX Runtime GPU..." -ForegroundColor Cyan
    
    # Test if we can import and get providers
    $testResult = & $pythonExe -c "import onnxruntime; print('Version:', onnxruntime.__version__); providers = onnxruntime.get_available_providers(); print('Providers:', providers); print('CUDA available:', 'CUDAExecutionProvider' in providers)" 2>&1
    
    Write-Host $testResult
    Write-Host ""
    
    if ($testResult -match "CUDA available: True") {
        Write-Host "✅ ONNX Runtime GPU reinstalled successfully!" -ForegroundColor Green
        Write-Host "✅ ONNX Runtime GPU đã được cài đặt lại thành công!" -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 If WinError 193 persists, it may be a CUDA DLL compatibility issue." -ForegroundColor Yellow
        Write-Host "💡 Nếu WinError 193 vẫn còn, có thể là vấn đề tương thích CUDA DLL." -ForegroundColor Yellow
        Write-Host "   Try setting CUDA_PATH_V11_8 environment variable if using CUDA 11.8" -ForegroundColor Yellow
        Write-Host "   Thử đặt biến môi trường CUDA_PATH_V11_8 nếu dùng CUDA 11.8" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  ONNX Runtime installed but CUDA provider may not work" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to reinstall onnxruntime-gpu" -ForegroundColor Red
}

