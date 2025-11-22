#!/usr/bin/env python
"""
Test Dia TTS API
Kiểm tra API Dia TTS
"""
import urllib.request
import urllib.error
import json
import sys
from pathlib import Path

def test_dia_api():
    """Test Dia TTS API endpoints"""
    base_url = "http://127.0.0.1:11111"
    
    print("=" * 60)
    print("Testing Dia TTS API...")
    print("Đang kiểm tra API Dia TTS...")
    print("=" * 60)
    print()
    
    # Test 1: Health Check
    print("1. Testing health check...")
    try:
        with urllib.request.urlopen(f"{base_url}/health", timeout=5) as response:
            data = json.loads(response.read().decode())
            print(f"   ✅ Health: {data.get('status', 'unknown')}")
            print()
    except (urllib.error.URLError, OSError) as e:
        print(f"   ❌ Error: {e}")
        print("   Make sure the backend is running: python start_backend.py")
        return False
    
    # Test 2: Get Model Info
    print("2. Getting Dia model info...")
    try:
        request_data = json.dumps({"model": "dia"}).encode()
        req = urllib.request.Request(
            f"{base_url}/api/tts/model/info",
            data=request_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=120) as response:
            data = json.loads(response.read().decode())
            if data.get("success"):
                info = data.get("info", {})
                print(f"   ✅ Model: {info.get('model', 'N/A')}")
                print(f"   ✅ Sample Rate: {info.get('sample_rate', 'N/A')} Hz")
                print(f"   ✅ Device: {info.get('device', 'N/A')}")
                print()
            else:
                print(f"   ❌ Error: {data.get('error', 'Unknown error')}")
                return False
    except urllib.error.HTTPError as e:
        print(f"   ❌ HTTP Error {e.code}: {e.read().decode()}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 3: Generate Speech
    print("3. Generating speech with Dia TTS...")
    print("   Text: [01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt.")
    
    request_data = json.dumps({
        "text": "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt.",
        "model": "dia",
        "temperature": 1.3,
        "top_p": 0.95,
        "cfg_scale": 3.0
    }).encode()
    
    output_path = Path(__file__).parent / "dia_test_output.wav"
    
    try:
        req = urllib.request.Request(
            f"{base_url}/api/tts/synthesize",
            data=request_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            audio_data = response.read()
            with open(output_path, "wb") as f:
                f.write(audio_data)
            
            file_size_mb = len(audio_data) / (1024 * 1024)
            print(f"   ✅ Success! Audio saved to: {output_path}")
            print(f"   ✅ Thành công! Audio đã được lưu tại: {output_path}")
            print(f"   📊 File size: {file_size_mb:.2f} MB")
            print()
            print("=" * 60)
            print("✅ All tests passed!")
            print("✅ Tất cả kiểm tra đã vượt qua!")
            print("=" * 60)
            print()
            print(f"Play the audio file: {output_path}")
            print(f"Phát file audio: {output_path}")
            return True
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"   ❌ HTTP Error {e.code}: {error_body}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_dia_api()
    sys.exit(0 if success else 1)

