#!/usr/bin/env python
"""
Generate Speech with Saved Preset
Tạo Giọng nói với Preset Đã Lưu
"""
import urllib.request
import urllib.error
import json
import sys
import argparse
from pathlib import Path

def load_preset(preset_path):
    """Load preset configuration"""
    with open(preset_path, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_with_preset(text, preset_path, output_path=None, base_url="http://127.0.0.1:11111"):
    """Generate speech using preset configuration"""
    
    # Load preset
    preset = load_preset(preset_path)
    
    # Prepare request
    speaker_id = preset["speaker_id"]
    text_with_speaker = f"[{speaker_id}] {text}"
    
    request_data = json.dumps({
        "text": text_with_speaker,
        "model": preset.get("model", "dia"),
        "temperature": preset.get("temperature", 1.3),
        "top_p": preset.get("top_p", 0.95),
        "cfg_scale": preset.get("cfg_scale", 3.0),
        "max_tokens": preset.get("max_tokens", None)
    }).encode()
    
    # Set output path
    if output_path is None:
        output_path = Path(__file__).parent / f"output_{preset['name'].replace(' ', '_').lower()}.wav"
    else:
        output_path = Path(output_path)
    
    print(f"Generating speech with preset: {preset['name']}")
    print(f"Tạo giọng nói với preset: {preset['name']}")
    print(f"Speaker ID: [{speaker_id}]")
    print(f"Text: {text[:100]}...")
    print()
    
    try:
        req = urllib.request.Request(
            f"{base_url}/api/tts/synthesize",
            data=request_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=120) as response:
            audio_data = response.read()
            with open(output_path, "wb") as f:
                f.write(audio_data)
            
            file_size_mb = len(audio_data) / (1024 * 1024)
            print(f"✅ Success! Audio saved to: {output_path}")
            print(f"✅ Thành công! Audio đã được lưu tại: {output_path}")
            print(f"📊 File size: {file_size_mb:.2f} MB")
            return str(output_path)
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"❌ HTTP Error {e.code}: {error_body}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    parser = argparse.ArgumentParser(description="Generate speech with saved preset")
    parser.add_argument("text", help="Text to generate speech for (Vietnamese)")
    parser.add_argument(
        "--preset",
        default="presets/female_narrator_preset.json",
        help="Path to preset file"
    )
    parser.add_argument(
        "--output",
        "-o",
        default=None,
        help="Output file path (default: auto-generated)"
    )
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:11111",
        help="Backend API base URL"
    )
    
    args = parser.parse_args()
    
    preset_path = Path(__file__).parent / args.preset
    if not preset_path.exists():
        print(f"❌ Preset file not found: {preset_path}")
        sys.exit(1)
    
    output_path = generate_with_preset(
        args.text,
        preset_path,
        args.output,
        args.base_url
    )
    
    if output_path:
        print()
        print(f"Play the audio file: {output_path}")
        print(f"Phát file audio: {output_path}")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

