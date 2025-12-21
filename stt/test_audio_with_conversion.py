"""
Test STT Backend with Audio File (with sample rate conversion)
Converts 24kHz audio to 16kHz before sending to STT backend
"""
import requests
import json
import tempfile
import os
from pathlib import Path
import librosa
import soundfile as sf

# Audio file paths
audio_path = Path(r"D:\Works\source\novel-reader\novel-app\storage\audio\56578951-8742-4927-b1d9-9ee48aed8373\chapter_001\paragraph_003\paragraph_003.wav")
metadata_path = Path(r"D:\Works\source\novel-reader\novel-app\storage\audio\56578951-8742-4927-b1d9-9ee48aed8373\chapter_001\paragraph_003\paragraph_003_metadata.json")

# Load expected text from metadata
expected_text = None
if metadata_path.exists():
    with open(metadata_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
        expected_text = metadata.get("normalizedText") or metadata.get("subtitle", "").replace("\n", " ")
        sample_rate = metadata.get("sampleRate") or metadata.get("metadata", {}).get("sample_rate")
        print(f"Metadata sample rate: {sample_rate} Hz")

print("=" * 70)
print("Testing STT Backend Transcription (with Sample Rate Conversion)")
print("=" * 70)
print(f"\nAudio file: {audio_path}")
print(f"File exists: {audio_path.exists()}")

if not audio_path.exists():
    print(f"\n❌ Error: Audio file not found!")
    exit(1)

if audio_path.exists():
    print(f"File size: {audio_path.stat().st_size / 1024:.2f} KB")

print(f"\nExpected text:")
print(f"  {expected_text}")
print("\n" + "=" * 70)

# Step 1: Load and convert audio
print("\n📊 Step 1: Loading and converting audio...")
try:
    # Load audio with original sample rate
    audio, sr_original = librosa.load(str(audio_path), sr=None)
    print(f"  Original sample rate: {sr_original} Hz")
    print(f"  Audio duration: {len(audio) / sr_original:.2f} seconds")
    print(f"  Audio shape: {audio.shape}")
    
    # Convert to 16kHz (faster-whisper requirement)
    target_sr = 16000
    if sr_original != target_sr:
        print(f"  Converting from {sr_original} Hz to {target_sr} Hz...")
        audio_16k = librosa.resample(audio, orig_sr=sr_original, target_sr=target_sr)
        print(f"  ✅ Converted: {len(audio_16k) / target_sr:.2f} seconds")
    else:
        audio_16k = audio
        print(f"  ✅ Already at {target_sr} Hz, no conversion needed")
    
    # Save to temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    temp_file_path = temp_file.name
    temp_file.close()
    
    # Save as 16kHz WAV
    sf.write(temp_file_path, audio_16k, target_sr)
    print(f"  ✅ Saved converted audio to: {temp_file_path}")
    print(f"  Converted file size: {os.path.getsize(temp_file_path) / 1024:.2f} KB")
    
except Exception as e:
    print(f"\n❌ Error loading/converting audio: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Step 2: Test transcription
print("\n🎤 Step 2: Sending to STT backend...")
url = "http://localhost:11210/api/stt/transcribe"
params = {
    "language": "en",
    "vad_filter": "true",
    "return_timestamps": "true",
    "word_timestamps": "false",
}

print(f"  URL: {url}")
print(f"  Parameters: {params}")

try:
    with open(temp_file_path, "rb") as audio_file:
        files = {"audio": ("test_audio_16k.wav", audio_file, "audio/wav")}
        print(f"  Sending request...")
        # Use a longer timeout for model loading and processing
        response = requests.post(url, params=params, files=files, timeout=300)
    
    print(f"  Response status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ Transcription successful!")
        print("\n" + "=" * 70)
        print("Transcription Result:")
        print("=" * 70)
        print(json.dumps(result, indent=2))
        
        if "data" in result and "text" in result["data"]:
            transcribed_text = result["data"]["text"]
            detected_language = result["data"].get("language", "unknown")
            language_prob = result["data"].get("language_probability", 0)
            segments = result["data"].get("segments", [])
            
            print("\n" + "=" * 70)
            print("Text Comparison:")
            print("=" * 70)
            print(f"\nExpected ({len(expected_text)} chars):")
            print(f"  {expected_text}")
            print(f"\nTranscribed ({len(transcribed_text)} chars):")
            print(f"  {transcribed_text}")
            print(f"\nDetected Language: {detected_language} (probability: {language_prob:.2%})")
            print(f"Number of segments: {len(segments)}")
            
            # Show segments
            if segments:
                print("\nSegments:")
                for i, seg in enumerate(segments, 1):
                    print(f"  [{i}] [{seg.get('start', 0):.2f}s - {seg.get('end', 0):.2f}s]: {seg.get('text', '')}")
            
            # Simple comparison
            expected_clean = expected_text.lower().replace("—", "-").replace("\n", " ").strip()
            transcribed_clean = transcribed_text.lower().strip()
            
            print("\n" + "=" * 70)
            print("Comparison:")
            print("=" * 70)
            
            # Word-level comparison
            expected_words = set(expected_clean.split())
            transcribed_words = set(transcribed_clean.split())
            common_words = expected_words & transcribed_words
            
            print(f"\nExpected words: {len(expected_words)}")
            print(f"Transcribed words: {len(transcribed_words)}")
            print(f"Common words: {len(common_words)}")
            if expected_words:
                match_percentage = len(common_words) / len(expected_words) * 100
                print(f"Word match: {match_percentage:.1f}%")
            
            if expected_clean in transcribed_clean or transcribed_clean in expected_clean:
                print("\n✅ Texts match closely!")
            elif len(common_words) / max(len(expected_words), 1) > 0.7:
                print("\n✅ Good match (>70% words in common)")
            else:
                print("\n⚠️  Texts differ (this is normal - STT may have slight variations)")
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

finally:
    # Clean up temporary file
    if os.path.exists(temp_file_path):
        try:
            os.unlink(temp_file_path)
            print(f"\n🧹 Cleaned up temporary file: {temp_file_path}")
        except Exception as e:
            print(f"\n⚠️  Warning: Could not delete temp file: {e}")

print("\n" + "=" * 70)
print("Test completed!")
print("=" * 70)

