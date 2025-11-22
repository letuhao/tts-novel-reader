#!/bin/bash
# Test TTS Backend with curl
# Kiểm tra TTS Backend với curl

echo "=== Testing TTS Backend ==="
echo ""

# Test 1: Health Check
echo "1. Health Check:"
echo "curl -X GET http://localhost:11111/health"
echo ""
curl -X GET "http://localhost:11111/health" -v
echo ""
echo ""

# Test 2: Audio Generation Test
echo "2. Audio Generation Test:"
echo "curl -X POST http://localhost:11111/api/tts/synthesize"
echo ""
curl -X POST "http://localhost:11111/api/tts/synthesize" \
  -H "Content-Type: application/json" \
  -d '{"text":"[05] Xin chào","model":"dia","store":false,"return_audio":false}' \
  -v --max-time 30
echo ""

