# Simple Dia TTS Test
# Kiểm tra Dia TTS Đơn giản

Write-Host "Testing Dia TTS..." -ForegroundColor Cyan
Write-Host ""

# Test: Generate Speech
$body = @{
    text = "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt."
    model = "dia"
    temperature = 1.3
    top_p = 0.95
    cfg_scale = 3.0
} | ConvertTo-Json -Depth 10

Write-Host "Sending request to backend..." -ForegroundColor Yellow
Write-Host "Đang gửi yêu cầu đến backend..." -ForegroundColor Yellow
Write-Host ""

try {
    $outputPath = "dia_test_output.wav"
    Invoke-WebRequest -Uri "http://127.0.0.1:11111/api/tts/synthesize" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -OutFile $outputPath
    
    Write-Host "✅ Success! Audio saved to: $outputPath" -ForegroundColor Green
    Write-Host "✅ Thành công! Audio đã được lưu tại: $outputPath" -ForegroundColor Green
    
    # Get file info
    $file = Get-Item $outputPath
    $fileSizeMB = [math]::Round($file.Length / 1MB, 2)
    Write-Host ""
    Write-Host "📊 File size: $fileSizeMB MB" -ForegroundColor Cyan
    Write-Host "📁 Full path: $($file.FullName)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Play the file to hear the generated speech!" -ForegroundColor Yellow
    Write-Host "Phát file để nghe giọng nói đã tạo!" -ForegroundColor Yellow
    
} catch {
    Write-Host ""
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Make sure the backend is running: .\start_backend.ps1" -ForegroundColor Yellow
}

