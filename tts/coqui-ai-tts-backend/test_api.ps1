# Test Coqui TTS Backend API
# Kiểm tra API Coqui TTS Backend

$baseUrl = "http://localhost:11111"

Write-Host "🧪 Testing Coqui TTS Backend API..." -ForegroundColor Cyan
Write-Host "🧪 Đang kiểm tra API Coqui TTS Backend..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
Write-Host "1. Kiểm tra Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health Check: $($response.status)" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Model Info
Write-Host "2. Testing Model Info..." -ForegroundColor Yellow
Write-Host "2. Kiểm tra Model Info..." -ForegroundColor Yellow
try {
    $body = @{
        model = "xtts-english"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/tts/model/info" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Model Info:" -ForegroundColor Green
    Write-Host "   Model: $($response.info.model)" -ForegroundColor Gray
    Write-Host "   Sample Rate: $($response.info.sample_rate) Hz" -ForegroundColor Gray
    Write-Host "   Device: $($response.info.device)" -ForegroundColor Gray
    Write-Host "   Languages: $($response.info.languages.Count) supported" -ForegroundColor Gray
} catch {
    Write-Host "❌ Model Info failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Synthesize Speech (Basic)
Write-Host "3. Testing Synthesize Speech (Basic)..." -ForegroundColor Yellow
Write-Host "3. Kiểm tra Tổng hợp Giọng nói (Cơ bản)..." -ForegroundColor Yellow
try {
    $body = @{
        text = "Hello, this is a test of English text-to-speech using XTTS-v2 model. The backend is working correctly."
        model = "xtts-english"
        speaker = "Claribel Dervla"
        language = "en"
        store = $true
        return_audio = $true
    } | ConvertTo-Json
    
    $outputFile = "test_output.wav"
    Invoke-RestMethod -Uri "$baseUrl/api/tts/synthesize" -Method Post -Body $body -ContentType "application/json" -OutFile $outputFile
    
    if (Test-Path $outputFile) {
        $fileInfo = Get-Item $outputFile
        Write-Host "✅ Audio file created: $outputFile" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
        Write-Host "   Duration: ~$([math]::Round($fileInfo.Length / 24000 / 2, 2)) seconds (estimated)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Audio file not created" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Synthesize failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Error details: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Synthesize Speech (Get File ID Only)
Write-Host "4. Testing Synthesize Speech (File ID Only)..." -ForegroundColor Yellow
Write-Host "4. Kiểm tra Tổng hợp Giọng nói (Chỉ File ID)..." -ForegroundColor Yellow
try {
    $body = @{
        text = "This will return file metadata without audio in response."
        model = "xtts-english"
        speaker = "Claribel Dervla"
        language = "en"
        store = $true
        return_audio = $false
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/tts/synthesize" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Synthesize successful:" -ForegroundColor Green
    Write-Host "   Request ID: $($response.request_id)" -ForegroundColor Gray
    Write-Host "   File ID: $($response.file_metadata.file_id)" -ForegroundColor Gray
    Write-Host "   Duration: $([math]::Round($response.duration_seconds, 2)) seconds" -ForegroundColor Gray
    Write-Host "   Sample Rate: $($response.sample_rate) Hz" -ForegroundColor Gray
    
    $fileId = $response.file_metadata.file_id
} catch {
    Write-Host "❌ Synthesize failed: $_" -ForegroundColor Red
    $fileId = $null
}
Write-Host ""

# Test 5: Get Audio File (if we have file_id)
if ($fileId) {
    Write-Host "5. Testing Get Audio File..." -ForegroundColor Yellow
    Write-Host "5. Kiểm tra Lấy File Audio..." -ForegroundColor Yellow
    try {
        $outputFile = "test_downloaded.wav"
        Invoke-RestMethod -Uri "$baseUrl/api/tts/audio/$fileId" -Method Get -OutFile $outputFile
        
        if (Test-Path $outputFile) {
            $fileInfo = Get-Item $outputFile
            Write-Host "✅ Audio file downloaded: $outputFile" -ForegroundColor Green
            Write-Host "   Size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Get Audio failed: $_" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test 6: Get Metadata
    Write-Host "6. Testing Get Metadata..." -ForegroundColor Yellow
    Write-Host "6. Kiểm tra Lấy Metadata..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/tts/audio/$fileId/metadata" -Method Get
        Write-Host "✅ Metadata retrieved:" -ForegroundColor Green
        Write-Host "   File ID: $($response.metadata.file_id)" -ForegroundColor Gray
        Write-Host "   Text: $($response.metadata.text.Substring(0, [Math]::Min(50, $response.metadata.text.Length)))..." -ForegroundColor Gray
        Write-Host "   Created: $($response.metadata.created_at)" -ForegroundColor Gray
        Write-Host "   Expires: $($response.metadata.expires_at)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Get Metadata failed: $_" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test 7: Delete Audio File
    Write-Host "7. Testing Delete Audio File..." -ForegroundColor Yellow
    Write-Host "7. Kiểm tra Xóa File Audio..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/tts/audio/$fileId" -Method Delete
        Write-Host "✅ Audio file deleted: $($response.file_id)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Delete failed: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 8: Storage Stats
Write-Host "8. Testing Storage Stats..." -ForegroundColor Yellow
Write-Host "8. Kiểm tra Thống kê Lưu trữ..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/tts/storage/stats" -Method Get
    Write-Host "✅ Storage Stats:" -ForegroundColor Green
    Write-Host "   Total Files: $($response.stats.total_files)" -ForegroundColor Gray
    Write-Host "   Total Size: $([math]::Round($response.stats.total_size_mb, 2)) MB" -ForegroundColor Gray
    Write-Host "   Active Files: $($response.stats.active_files)" -ForegroundColor Gray
    Write-Host "   Expired Files: $($response.stats.expired_files)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Storage Stats failed: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host "✅ Tất cả kiểm tra đã hoàn tất!" -ForegroundColor Green

