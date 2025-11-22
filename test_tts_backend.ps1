# Test TTS Backend Status
# Kiểm tra Trạng thái TTS Backend

Write-Host "=== Testing TTS Backend ===" -ForegroundColor Cyan
Write-Host ""

$ttsUrl = "http://localhost:11111"
$healthUrl = "$ttsUrl/health"

Write-Host "Testing TTS Backend at $ttsUrl..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Check
Write-Host "1. Health Check:" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ TTS Backend is RUNNING" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ TTS Backend is NOT responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please start the TTS backend:" -ForegroundColor Cyan
    Write-Host "   cd app" -ForegroundColor White
    Write-Host "   python start_backend.py" -ForegroundColor White
    exit 1
}

Write-Host ""

# Test 2: Test Audio Generation (simple test)
Write-Host "2. Testing Audio Generation:" -ForegroundColor Cyan
try {
    $testRequest = @{
        text = "[05] Xin chào"
        model = "dia"
        store = $false
        return_audio = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$ttsUrl/api/tts/synthesize" -Method POST -Body $testRequest -ContentType "application/json" -TimeoutSec 30 -ErrorAction Stop
    Write-Host "   ✅ Audio generation works" -ForegroundColor Green
    Write-Host "   Response keys: $($response.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Audio generation failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Yellow
        try {
            $errorBody = $_.Exception.Response.Content | ConvertFrom-Json
            Write-Host "   Error Details: $($errorBody | ConvertTo-Json -Compress)" -ForegroundColor Yellow
        } catch {
            Write-Host "   Error Details: $($_.Exception.Response.Content)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== TTS Backend Test Complete ===" -ForegroundColor Green

