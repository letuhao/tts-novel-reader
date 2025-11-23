# Fix NumPy Version Issue
# Fixes: "A module that was compiled using NumPy 1.x cannot be run in NumPy 2.2.6"

Write-Host "🔧 Fixing NumPy version compatibility issue..." -ForegroundColor Cyan

# Get Python executable from virtual environment
$venvPath = Join-Path $PSScriptRoot ".venv"
$pythonExe = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Virtual environment not found at: $venvPath" -ForegroundColor Red
    Write-Host "Please run setup.ps1 or setup_gpu.ps1 first" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Step 1: Checking current NumPy version..." -ForegroundColor Yellow
$currentVersion = & $pythonExe -c "import numpy; print(numpy.__version__)" 2>&1
Write-Host "Current NumPy version: $currentVersion" -ForegroundColor Gray

if ($LASTEXITCODE -eq 0) {
    # Check if version is >= 2.0.0
    $versionParts = $currentVersion -split '\.'
    $majorVersion = [int]$versionParts[0]
    
    if ($majorVersion -ge 2) {
        Write-Host "⚠️  NumPy 2.x detected. Downgrading to 1.x..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ NumPy 1.x already installed. Reinstalling to ensure compatibility..." -ForegroundColor Green
    }
}

Write-Host "📦 Step 2: Uninstalling NumPy..." -ForegroundColor Yellow
& $pythonExe -m pip uninstall numpy -y 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "📦 Step 3: Installing NumPy 1.x (>=1.21.6,<2.0.0)..." -ForegroundColor Yellow
& $pythonExe -m pip install "numpy>=1.21.6,<2.0.0" --force-reinstall --no-cache-dir
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install NumPy 1.x!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Step 4: Verifying NumPy installation..." -ForegroundColor Yellow
$newVersion = & $pythonExe -c "import numpy; print(f'NumPy {numpy.__version__}')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ $newVersion installed successfully!" -ForegroundColor Green
    
    # Test numpy import
    & $pythonExe -c "import numpy as np; print('✅ NumPy import successful'); print(f'Version: {np.__version__}')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 NumPy version fix completed successfully!" -ForegroundColor Green
        Write-Host "You can now restart the backend server." -ForegroundColor Cyan
    } else {
        Write-Host "❌ NumPy import test failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Failed to verify NumPy installation!" -ForegroundColor Red
    exit 1
}

