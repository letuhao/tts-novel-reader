# Test Chapter 1 Full Data with curl
# Test dữ liệu đầy đủ Chapter 1 với curl

Write-Host "=== Testing Chapter 1 Full Data ===" -ForegroundColor Green
Write-Host ""

# Read file and parse paragraphs
$filePath = "D:\Works\source\novel-reader\novel-app\backend\storage\sample.txt"
$content = Get-Content -Path $filePath -Encoding UTF8 -Raw

# Simple paragraph extraction (split by double newline or empty lines)
$lines = $content -split "`n"
$paragraphs = @()
$currentPara = @()

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed -eq "..." -or $trimmed -match "^-+$") {
        if ($currentPara.Count -gt 0) {
            $paraText = ($currentPara -join " ").Trim()
            if ($paraText -ne "" -and $paraText -ne "...") {
                $paragraphs += $paraText
            }
            $currentPara = @()
        }
    } elseif ($trimmed -match "^Chương\s+\d+[::]*\s*$") {
        # Skip chapter header
        continue
    } else {
        $currentPara += $trimmed
    }
}

# Add last paragraph
if ($currentPara.Count -gt 0) {
    $paraText = ($currentPara -join " ").Trim()
    if ($paraText -ne "" -and $paraText -ne "...") {
        $paragraphs += $paraText
    }
}

Write-Host "📝 Extracted $($paragraphs.Count) paragraphs" -ForegroundColor Cyan
Write-Host ""

# Limit to first 20 for testing (full 162 may be too long)
$testParagraphs = $paragraphs[0..19]
Write-Host "🧪 Testing with first 20 paragraphs (for faster test)" -ForegroundColor Yellow
Write-Host ""

# Create request body
$body = @{
    paragraphs = $testParagraphs
    returnVoiceIds = $true
} | ConvertTo-Json -Depth 10 -Compress

# Show preview
Write-Host "📄 Preview (first 3 paragraphs):" -ForegroundColor Cyan
for ($i = 0; $i -lt [Math]::Min(3, $testParagraphs.Count); $i++) {
    $preview = if ($testParagraphs[$i].Length -gt 80) { 
        $testParagraphs[$i].Substring(0, 80) + "..." 
    } else { 
        $testParagraphs[$i] 
    }
    Write-Host "   $($i+1). $preview" -ForegroundColor White
}
Write-Host ""

Write-Host "🚀 Calling role detection API..." -ForegroundColor Green
Write-Host "   URL: http://localhost:11110/api/role-detection/detect" -ForegroundColor White
Write-Host "   Paragraphs: $($testParagraphs.Count)" -ForegroundColor White
Write-Host ""

$startTime = Get-Date

try {
    $response = Invoke-RestMethod -Uri "http://localhost:11110/api/role-detection/detect" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 300
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✅ API call completed in $([Math]::Round($duration, 2)) seconds!" -ForegroundColor Green
    Write-Host ""
    
    if ($response.success) {
        Write-Host "📊 Results:" -ForegroundColor Cyan
        Write-Host "=" * 60 -ForegroundColor Gray
        Write-Host ""
        
        # Count roles
        $roleCounts = @{}
        foreach ($role in $response.data.role_map.PSObject.Properties.Value) {
            if ($roleCounts.ContainsKey($role)) {
                $roleCounts[$role]++
            } else {
                $roleCounts[$role] = 1
            }
        }
        
        Write-Host "📈 Role Distribution:" -ForegroundColor Yellow
        foreach ($role in $roleCounts.Keys) {
            $count = $roleCounts[$role]
            $pct = [Math]::Round(($count / $testParagraphs.Count) * 100, 1)
            Write-Host "   $($role.PadRight(10)): $($count.ToString().PadLeft(3)) paragraphs ($pct%)" -ForegroundColor White
        }
        Write-Host ""
        
        # Show sample results
        Write-Host "📋 Sample Results (first 10):" -ForegroundColor Yellow
        Write-Host "-" * 60 -ForegroundColor Gray
        for ($i = 0; $i -lt [Math]::Min(10, $testParagraphs.Count); $i++) {
            $role = $response.data.role_map.$i
            $voice = $response.data.voice_map.$i
            $preview = if ($testParagraphs[$i].Length -gt 60) { 
                $testParagraphs[$i].Substring(0, 60) + "..." 
            } else { 
                $testParagraphs[$i] 
            }
            Write-Host "   $($i+1.ToString().PadLeft(3)). [$($role.PadRight(8))] → $($voice.PadRight(15)) | $preview" -ForegroundColor White
        }
        Write-Host ""
        
    } else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}

