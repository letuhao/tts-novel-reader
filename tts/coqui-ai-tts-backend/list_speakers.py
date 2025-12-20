"""
List all XTTS-v2 speakers
Liệt kê tất cả giọng nói XTTS-v2
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from TTS.api import TTS
import torch

def list_all_speakers():
    """List all available speakers in XTTS-v2"""
    print("Loading XTTS-v2 model...")
    print("Đang tải model XTTS-v2...")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    tts.to(device)
    
    speakers = tts.speakers
    
    print(f"\n✅ Total speakers: {len(speakers)}")
    print(f"✅ Tổng số giọng nói: {len(speakers)}\n")
    
    print("=" * 60)
    print("All XTTS-v2 Speakers / Tất cả Giọng nói XTTS-v2")
    print("=" * 60)
    
    for i, speaker in enumerate(speakers, 1):
        print(f"{i:2d}. {speaker}")
    
    print("=" * 60)
    
    # Group by estimated gender (based on name patterns)
    print("\n📊 Estimated Gender Distribution / Phân bố Giới tính Ước tính:")
    print("-" * 60)
    
    # Common female name patterns
    female_patterns = ['a', 'ia', 'elle', 'elle', 'ie', 'y', 'ette', 'ella', 'ina', 'ja', 'ka', 'la', 'ma', 'na', 'ra', 'sa', 'ta', 'va', 'za']
    # Common male name patterns  
    male_patterns = ['rew', 'dr', 'io', 'on', 'in', 'en', 'an', 'er', 'or', 'ur', 'ul', 'im', 'am', 'um', 'ah', 'oh', 'uh']
    
    female_speakers = []
    male_speakers = []
    unknown_speakers = []
    
    for speaker in speakers:
        name_lower = speaker.lower()
        first_name = name_lower.split()[0] if ' ' in name_lower else name_lower
        
        # Simple heuristic based on name endings
        is_female = any(first_name.endswith(pattern) for pattern in female_patterns)
        is_male = any(first_name.endswith(pattern) for pattern in male_patterns)
        
        if is_female and not is_male:
            female_speakers.append(speaker)
        elif is_male and not is_female:
            male_speakers.append(speaker)
        else:
            unknown_speakers.append(speaker)
    
    print(f"Female / Nữ (estimated): {len(female_speakers)}")
    print(f"Male / Nam (estimated): {len(male_speakers)}")
    print(f"Unknown / Không xác định: {len(unknown_speakers)}")
    
    print("\n🌍 Language/Accent Hints / Gợi ý Ngôn ngữ/Giọng điệu:")
    print("-" * 60)
    
    # Language hints based on names
    language_hints = {
        "English": ["Claribel", "Daisy", "Gracie", "Tammie", "Alison", "Ana", "Andrew", "Craig", "Damien", "Nova", "Chandra", "Lilya", "Narelle", "Rosemary", "Aaron"],
        "Spanish": ["Alma", "María", "Marcos", "Luis"],
        "German": ["Gitta", "Henriette", "Wulf"],
        "Nordic": ["Maja", "Camilla", "Ludvig", "Baldur"],
        "Eastern European": ["Lidiya", "Szofi", "Barbora", "Damjan", "Viktor"],
        "Japanese": ["Alexandra", "Kazuhiko", "Xavier"],
        "Middle Eastern": ["Badr", "Suad", "Eugenio"],
        "Turkish": ["Ilkin", "Eugenio"],
        "Other": ["Asya", "Ferran", "Filip", "Kumar", "Torcull", "Zacharie"]
    }
    
    for lang, names in language_hints.items():
        matching = [s for s in speakers if any(name in s for name in names)]
        if matching:
            print(f"{lang}: {len(matching)} speakers")
            for speaker in matching[:5]:  # Show first 5
                print(f"  - {speaker}")
            if len(matching) > 5:
                print(f"  ... and {len(matching) - 5} more")
    
    return speakers

if __name__ == "__main__":
    speakers = list_all_speakers()
    
    print("\n💡 Tip: Use any speaker with any of the 17 supported languages!")
    print("💡 Mẹo: Sử dụng bất kỳ giọng nói nào với bất kỳ trong 17 ngôn ngữ được hỗ trợ!")
    print("\nSupported languages / Ngôn ngữ được hỗ trợ:")
    print("en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh-cn, hu, ko, ja, hi")

