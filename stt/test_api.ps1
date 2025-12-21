# Test STT Backend API
# PowerShell script to test the STT backend service

$BaseUrl = "http://localhost:11210"

Write-Host "Testing STT Backend API..." -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan

# Test health endpoint
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Write-Host "Health check: $($health.status)" -ForegroundColor Green
    Write-Host ($health | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
}

# Test root endpoint
Write-Host "`n2. Testing root endpoint..." -ForegroundColor Yellow
try {
    $root = Invoke-RestMethod -Uri "$BaseUrl/" -Method Get
    Write-Host "Root endpoint response:" -ForegroundColor Green
    Write-Host ($root | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Root endpoint failed: $_" -ForegroundColor Red
}

# Note: To test transcription, you need an audio file
Write-Host "`n3. To test transcription:" -ForegroundColor Yellow
Write-Host "   POST $BaseUrl/api/stt/transcribe" -ForegroundColor Cyan
Write-Host "   Content-Type: multipart/form-data" -ForegroundColor Cyan
Write-Host "   Form data: audio=<audio_file>" -ForegroundColor Cyan
Write-Host "`n   Example (if you have test_audio.wav):" -ForegroundColor Gray
Write-Host "   curl -X POST `"$BaseUrl/api/stt/transcribe?language=en`" -F `"audio=@test_audio.wav`"" -ForegroundColor Gray

