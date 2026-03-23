"""
Test STT Backend with Audio File
"""
import requests
import json
from pathlib import Path

# Audio file path
audio_path = Path(__file__).parent.parent / "novel-app" / "storage" / "audio" / "56578951-8742-4927-b1d9-9ee48aed8373" / "chapter_001" / "paragraph_003" / "paragraph_003.wav"

# Expected text from metadata
expected_text = "debris is about to reach me— Suddenly, a searing pain hits me like the wrath of God. It's as if my skull is breaking open and my body is splitting apart. As the pain stops, my body is lost in the dust cloud."

print("=" * 70)
print("Testing STT Backend Transcription")
print("=" * 70)
print(f"\nAudio file: {audio_path}")
print(f"File exists: {audio_path.exists()}")
if audio_path.exists():
    print(f"File size: {audio_path.stat().st_size / 1024:.2f} KB")
print(f"\nExpected text:")
print(f"  {expected_text}")
print("\n" + "=" * 70)

# Test transcription
url = "http://localhost:11210/api/stt/transcribe"
params = {
    "language": "en",
    "vad_filter": "true",
    "return_timestamps": "true",
}

print(f"\nSending request to: {url}")
print(f"Parameters: {params}")

try:
    with open(audio_path, "rb") as audio_file:
        files = {"audio": (audio_path.name, audio_file, "audio/wav")}
        response = requests.post(url, params=params, files=files, timeout=120)
    
    print(f"\nResponse status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ Transcription successful!")
        print("\n" + "=" * 70)
        print("Transcription Result:")
        print("=" * 70)
        print(json.dumps(result, indent=2))
        
        if "data" in result and "text" in result["data"]:
            transcribed_text = result["data"]["text"]
            print("\n" + "=" * 70)
            print("Text Comparison:")
            print("=" * 70)
            print(f"\nExpected: {expected_text}")
            print(f"\nTranscribed: {transcribed_text}")
            
            # Simple comparison
            expected_clean = expected_text.lower().replace("—", "-").replace("\n", " ").strip()
            transcribed_clean = transcribed_text.lower().strip()
            
            if expected_clean in transcribed_clean or transcribed_clean in expected_clean:
                print("\n✅ Texts match closely!")
            else:
                print("\n⚠️  Texts differ (this is normal - STT may have slight variations)")
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

