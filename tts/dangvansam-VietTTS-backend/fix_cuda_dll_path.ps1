# Fix CUDA DLL Path for ONNX Runtime
# Sửa Đường dẫn DLL CUDA cho ONNX Runtime

Write-Host "🔧 Fixing CUDA DLL Path for ONNX Runtime..." -ForegroundColor Cyan
Write-Host "🔧 Đang sửa Đường dẫn DLL CUDA cho ONNX Runtime..." -ForegroundColor Cyan
Write-Host ""

# Check CUDA_PATH
$cudaPath = $env:CUDA_PATH
if ($cudaPath) {
    Write-Host "✅ CUDA_PATH: $cudaPath" -ForegroundColor Green
    
    # Check if CUDA bin is in PATH
    $cudaBin = Join-Path $cudaPath "bin"
    $currentPath = $env:PATH
    
    if ($currentPath -notlike "*$cudaBin*") {
        Write-Host "⚠️  CUDA bin not in PATH, adding it..." -ForegroundColor Yellow
        $env:PATH = "$cudaBin;$env:PATH"
        Write-Host "✅ Added CUDA bin to PATH for this session" -ForegroundColor Green
        Write-Host "   (To make permanent, add to system PATH)" -ForegroundColor Gray
        Write-Host "   (Để làm vĩnh viễn, thêm vào PATH hệ thống)" -ForegroundColor Gray
    } else {
        Write-Host "✅ CUDA bin already in PATH" -ForegroundColor Green
    }
    
    # Check for required CUDA DLLs
    Write-Host ""
    Write-Host "🔍 Checking for CUDA DLLs..." -ForegroundColor Cyan
    $requiredDlls = @(
        "cudart64_*.dll",
        "cublas64_*.dll",
        "curand64_*.dll",
        "cusolver64_*.dll",
        "cusparse64_*.dll",
        "cufft64_*.dll"
    )
    
    $foundDlls = 0
    foreach ($pattern in $requiredDlls) {
        $dlls = Get-ChildItem -Path $cudaBin -Filter $pattern -ErrorAction SilentlyContinue
        if ($dlls) {
            $foundDlls++
            Write-Host "  ✅ Found: $($dlls[0].Name)" -ForegroundColor Green
        }
    }
    
    if ($foundDlls -eq 0) {
        Write-Host "⚠️  No CUDA DLLs found in $cudaBin" -ForegroundColor Yellow
        Write-Host "   This might be the issue - ONNX Runtime needs CUDA runtime DLLs" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "✅ Found $foundDlls types of CUDA DLLs" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  CUDA_PATH not set" -ForegroundColor Yellow
    Write-Host "   Set it to your CUDA installation directory" -ForegroundColor Yellow
    Write-Host "   Đặt nó thành thư mục cài đặt CUDA của bạn" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 The WinError 193 is usually caused by:" -ForegroundColor Yellow
Write-Host "   1. Missing CUDA runtime DLLs in PATH" -ForegroundColor Yellow
Write-Host "   2. Architecture mismatch (32-bit vs 64-bit) - already fixed" -ForegroundColor Yellow
Write-Host "   3. Missing Visual C++ Redistributable" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Lỗi WinError 193 thường do:" -ForegroundColor Yellow
Write-Host "   1. Thiếu DLL runtime CUDA trong PATH" -ForegroundColor Yellow
Write-Host "   2. Lệch kiến trúc (32-bit vs 64-bit) - đã sửa" -ForegroundColor Yellow
Write-Host "   3. Thiếu Visual C++ Redistributable" -ForegroundColor Yellow

