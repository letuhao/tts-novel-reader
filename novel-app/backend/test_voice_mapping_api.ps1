# Test Script for Enhanced Voice Mapping API
# Script Kiểm Tra cho API Ánh Xạ Giọng Nâng Cao

$baseURL = "http://localhost:11110"
$apiBase = "$baseURL/api/voice-mapping"

Write-Host "🧪 Testing Enhanced Voice Mapping API" -ForegroundColor Cyan
Write-Host "🧪 Kiểm Tra API Ánh Xạ Giọng Nâng Cao" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get all models
Write-Host "1️⃣  Testing GET /api/voice-mapping/models" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/models" -Method Get
    Write-Host "✅ Success: Found $($response.count) models" -ForegroundColor Green
    $response.models | ForEach-Object {
        Write-Host "   - $($_.displayName) ($($_.name))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get available voices for Coqui XTTS-v2
Write-Host "2️⃣  Testing GET /api/voice-mapping/voices/coqui-xtts-v2" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/voices/coqui-xtts-v2" -Method Get
    Write-Host "✅ Success: Found $($response.count) voices" -ForegroundColor Green
    Write-Host "   First 5 voices: $($response.voices[0..4] -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get male voices for Coqui XTTS-v2
Write-Host "3️⃣  Testing GET /api/voice-mapping/voices/coqui-xtts-v2?gender=male" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/voices/coqui-xtts-v2?gender=male" -Method Get
    Write-Host "✅ Success: Found $($response.count) male voices" -ForegroundColor Green
    Write-Host "   First 5: $($response.voices[0..4] -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get default mappings for Coqui XTTS-v2
Write-Host "4️⃣  Testing GET /api/voice-mapping/default/coqui-xtts-v2" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/default/coqui-xtts-v2" -Method Get
    Write-Host "✅ Success: Default mappings retrieved" -ForegroundColor Green
    Write-Host "   Narrator: $($response.mappings.narrator)" -ForegroundColor Gray
    Write-Host "   Male_1: $($response.mappings.male_1)" -ForegroundColor Gray
    Write-Host "   Female_1: $($response.mappings.female_1)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Resolve voice for a role
Write-Host "5️⃣  Testing POST /api/voice-mapping/resolve" -ForegroundColor Yellow
try {
    $body = @{
        role = "male_1"
        model = "coqui-xtts-v2"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/resolve" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Success: Role 'male_1' → Voice '$($response.voice)'" -ForegroundColor Green
    Write-Host "   Normalized: $($response.normalizedRole)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Test backward compatibility (male → male_1)
Write-Host "6️⃣  Testing backward compatibility (male → male_1)" -ForegroundColor Yellow
try {
    $body = @{
        role = "male"
        model = "coqui-xtts-v2"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/resolve" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Success: Role 'male' normalized to '$($response.normalizedRole)' → Voice '$($response.voice)'" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 7: Test with novel ID (if you have one)
Write-Host "7️⃣  Testing with novel-specific mapping" -ForegroundColor Yellow
Write-Host "   (Skipping - requires existing novel ID)" -ForegroundColor Gray
Write-Host "   To test: GET /api/voice-mapping/novel/{novelId}" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ API Tests Complete!" -ForegroundColor Green
Write-Host "✅ Hoàn Tất Kiểm Tra API!" -ForegroundColor Green

