# Fix ONNX Runtime SessionOptions Error
# Sửa lỗi ONNX Runtime SessionOptions

Write-Host "🔧 Fixing ONNX Runtime SessionOptions error..." -ForegroundColor Cyan

# Get Python executable from virtual environment
$venvPath = Join-Path $PSScriptRoot ".venv"
$pythonExe = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Virtual environment not found at: $venvPath" -ForegroundColor Red
    Write-Host "Please run setup.ps1 or setup_gpu.ps1 first" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Step 1: Checking current ONNX Runtime installation..." -ForegroundColor Yellow
$onnxCheck = & $pythonExe -c "try: import onnxruntime; print('Found:', hasattr(onnxruntime, 'SessionOptions')); except Exception as e: print('Error:', str(e))" 2>&1
Write-Host $onnxCheck

# Check installed packages
Write-Host "📦 Step 2: Checking installed ONNX packages..." -ForegroundColor Yellow
& $pythonExe -m pip list | Select-String "onnx" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Write-Host "🗑️  Step 3: Uninstalling all ONNX Runtime packages..." -ForegroundColor Yellow
& $pythonExe -m pip uninstall onnxruntime onnxruntime-gpu onnxruntime-cpu -y 2>&1 | Out-Null
Start-Sleep -Seconds 3

# Clean up any corrupted installations
Write-Host "🧹 Step 4: Cleaning up corrupted installations..." -ForegroundColor Yellow
$sitePackages = Join-Path $venvPath "Lib\site-packages"
$corruptedDirs = @("onnxruntime", "onnxruntime_gpu", "onnxruntime_cpu")
foreach ($dir in $corruptedDirs) {
    $path = Join-Path $sitePackages $dir
    if (Test-Path $path) {
        Write-Host "  Removing: $dir" -ForegroundColor Gray
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Also check for any incomplete/corrupted .dist-info folders
Get-ChildItem -Path $sitePackages -Filter "*onnxruntime*.dist-info" -ErrorAction SilentlyContinue | 
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "📦 Step 5: Ensuring NumPy 1.x is installed (required for onnxruntime)..." -ForegroundColor Yellow
& $pythonExe -m pip install "numpy>=1.21.6,<2.0.0" --force-reinstall --no-cache-dir 2>&1 | Out-Null

Write-Host "📦 Step 6: Installing onnxruntime-gpu==1.16.0..." -ForegroundColor Yellow
& $pythonExe -m pip install onnxruntime-gpu==1.16.0 --no-cache-dir --force-reinstall
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  onnxruntime-gpu installation failed, trying CPU version..." -ForegroundColor Yellow
    & $pythonExe -m pip install onnxruntime==1.16.0 --no-cache-dir --force-reinstall
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install onnxruntime!" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ Installed onnxruntime (CPU version)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Installed onnxruntime-gpu" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Step 7: Reinstalling NumPy 1.x (onnxruntime-gpu may have upgraded it to 2.x)..." -ForegroundColor Yellow
& $pythonExe -m pip install "numpy>=1.21.6,<2.0.0" --force-reinstall --no-cache-dir 2>&1 | Out-Null

Write-Host "✅ Step 8: Verifying installation..." -ForegroundColor Yellow
$testFile = Join-Path $env:TEMP "test_onnxruntime.py"
@"
try:
    import onnxruntime
    print('✅ onnxruntime imported successfully')
    print('Version: ' + str(onnxruntime.__version__))
    has_session = hasattr(onnxruntime, 'SessionOptions')
    print('Has SessionOptions: ' + str(has_session))
    
    # Test SessionOptions
    option = onnxruntime.SessionOptions()
    print('✅ SessionOptions created successfully')
    
    # Test providers
    providers = onnxruntime.get_available_providers()
    print('Available providers: ' + str(providers))
    print('✅ All tests passed!')
except Exception as e:
    print('❌ Error: ' + str(type(e).__name__) + ': ' + str(e))
    import traceback
    traceback.print_exc()
"@ | Out-File -FilePath $testFile -Encoding utf8

$testResult = & $pythonExe $testFile 2>&1
Remove-Item $testFile -ErrorAction SilentlyContinue

Write-Host $testResult

if ($LASTEXITCODE -eq 0 -and $testResult -match "✅ All tests passed") {
    Write-Host ""
    Write-Host "🎉 ONNX Runtime fix completed successfully!" -ForegroundColor Green
    Write-Host "You can now restart the backend server." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ ONNX Runtime verification failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    exit 1
}

