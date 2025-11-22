# Test Dia TTS API
# Kiểm tra API Dia TTS

Write-Host "Testing Dia TTS API..." -ForegroundColor Cyan
Write-Host "Đang kiểm tra API Dia TTS..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing health check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get
Write-Host "   ✅ Health: $($health.status)" -ForegroundColor Green
Write-Host ""

# Test 2: Get Dia Model Info
Write-Host "2. Getting Dia model info..." -ForegroundColor Yellow
$modelInfo = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/tts/model/info" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"model": "dia"}' | ConvertTo-Json

Write-Host "   ✅ Model Info:" -ForegroundColor Green
$modelInfo | ConvertFrom-Json | Format-List
Write-Host ""

# Test 3: Generate Speech
Write-Host "3. Generating speech with Dia TTS..." -ForegroundColor Yellow
Write-Host "   Text: [01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt." -ForegroundColor Gray

$requestBody = @{
    text = "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt."
    model = "dia"
    temperature = 1.3
    top_p = 0.95
    cfg_scale = 3.0
} | ConvertTo-Json

try {
    $outputPath = "dia_test_output.wav"
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/tts/synthesize" `
        -Method Post `
        -ContentType "application/json" `
        -Body $requestBody `
        -OutFile $outputPath
    
    Write-Host "   ✅ Success! Audio saved to: $outputPath" -ForegroundColor Green
    Write-Host "   ✅ Thành công! Audio đã được lưu tại: $outputPath" -ForegroundColor Green
    
    # Get file size
    $fileSize = (Get-Item $outputPath).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Host "   📊 File size: $fileSizeMB MB" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host "✅ Tất cả kiểm tra đã vượt qua!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Play the audio file: $outputPath" -ForegroundColor Yellow
    Write-Host "Phát file audio: $outputPath" -ForegroundColor Yellow
    
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
    Write-Host "   ❌ Lỗi: $_" -ForegroundColor Red
    exit 1
}

