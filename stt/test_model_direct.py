"""
Test faster-whisper model loading and transcription directly
"""
from pathlib import Path
from faster_whisper import WhisperModel
import sys

# Model path
model_path = Path(__file__).parent.parent / "models" / "faster-whisper-large-v3"
model_path = str(model_path.resolve())

# Audio path
audio_path = Path(__file__).parent.parent / "novel-app" / "storage" / "audio" / "56578951-8742-4927-b1d9-9ee48aed8373" / "chapter_001" / "paragraph_003" / "paragraph_003.wav"
audio_path = str(audio_path.resolve())

print("=" * 70)
print("Testing faster-whisper Directly")
print("=" * 70)
print(f"\nModel path: {model_path}")
print(f"Model exists: {Path(model_path).exists()}")
print(f"\nAudio path: {audio_path}")
print(f"Audio exists: {Path(audio_path).exists()}")

try:
    print("\nLoading model...")
    model = WhisperModel(
        model_path,
        device="cuda",
        compute_type="float16",
        num_workers=4,
    )
    print("✅ Model loaded successfully!")
    
    print("\nTranscribing audio...")
    segments, info = model.transcribe(
        audio_path,
        language="en",
        beam_size=5,
        vad_filter=True,
    )
    
    print(f"✅ Transcription started!")
    print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
    
    print("\nTranscription result:")
    print("=" * 70)
    full_text = []
    for segment in segments:
        print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
        full_text.append(segment.text)
    
    print("\n" + "=" * 70)
    print("Full text:")
    print("=" * 70)
    print(" ".join(full_text))
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

