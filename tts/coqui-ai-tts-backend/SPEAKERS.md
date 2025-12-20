# XTTS-v2 Speakers List
# Danh sách Giọng nói XTTS-v2

## 📋 Complete Speaker List / Danh sách Giọng nói Đầy đủ

XTTS-v2 includes **58 built-in speakers** covering multiple languages and accents.

XTTS-v2 bao gồm **58 giọng nói có sẵn** hỗ trợ nhiều ngôn ngữ và giọng điệu.

---

## 🎤 All Speakers (58 total)

### Female Speakers / Giọng nữ (Estimated ~35 speakers)

1. **Claribel Dervla**
2. **Daisy Studious**
3. **Gracie Wise**
4. **Tammie Ema**
5. **Alison Dietlinde**
6. **Ana Florence**
7. **Annmarie Nele**
8. **Asya Anara**
9. **Brenda Stern**
10. **Gitta Nikolina**
11. **Henriette Usha**
12. **Sofia Hellen**
13. **Tammy Grit**
14. **Tanja Adelina**
15. **Vjollca Johnnie**
16. **Nova Hogarth**
17. **Maja Ruoho**
18. **Uta Obando**
19. **Lidiya Szekeres**
20. **Chandra MacFarland**
21. **Szofi Granger**
22. **Camilla Holmström**
23. **Lilya Stainthorpe**
24. **Zofija Kendrick**
25. **Narelle Moon**
26. **Barbora MacLean**
27. **Alexandra Hisakawa**
28. **Alma María**
29. **Rosemary Okafor**
30. **Ige Behringer**

### Male Speakers / Giọng nam (Estimated ~23 speakers)

31. **Andrew Chipper**
32. **Badr Odhiambo**
33. **Dionisio Schuyler**
34. **Royston Min**
35. **Viktor Eka**
36. **Abrahan Mack**
37. **Adde Michal**
38. **Baldur Sanjin**
39. **Craig Gutsy**
40. **Damien Black**
41. **Gilberto Mathias**
42. **Ilkin Urbano**
43. **Kazuhiko Atallah**
44. **Ludvig Milivoj**
45. **Suad Qasim**
46. **Torcull Diarmuid**
47. **Viktor Menelaos**
48. **Zacharie Aimilios**
49. **Filip Traverse**
50. **Damjan Chapman**
51. **Wulf Carlevaro**
52. **Aaron Dreschner**
53. **Kumar Dahl**
54. **Eugenio Mataracı**
55. **Ferran Simen**
56. **Xavier Hayasaka**
57. **Luis Moray**
58. **Marcos Rudaski**

---

## 🌍 Language & Accent Hints / Gợi ý Ngôn ngữ & Giọng điệu

Based on speaker names, here are estimated language/accent associations:

Dựa trên tên giọng nói, đây là các liên kết ngôn ngữ/giọng điệu ước tính:

### English / Tiếng Anh
- **Claribel Dervla** - English (possibly Irish/British)
- **Daisy Studious** - English
- **Gracie Wise** - English
- **Tammie Ema** - English
- **Alison Dietlinde** - English
- **Ana Florence** - English
- **Andrew Chipper** - English
- **Craig Gutsy** - English
- **Damien Black** - English
- **Nova Hogarth** - English
- **Chandra MacFarland** - English
- **Lilya Stainthorpe** - English
- **Narelle Moon** - English (Australian)
- **Rosemary Okafor** - English (Nigerian)
- **Aaron Dreschner** - English
- **Luis Moray** - English/Spanish

### Spanish / Tiếng Tây Ban Nha
- **Alma María** - Spanish
- **Marcos Rudaski** - Spanish
- **Luis Moray** - Spanish/English

### German / Tiếng Đức
- **Gitta Nikolina** - German
- **Henriette Usha** - German
- **Wulf Carlevaro** - German

### Nordic / Bắc Âu
- **Maja Ruoho** - Finnish
- **Camilla Holmström** - Swedish
- **Ludvig Milivoj** - Nordic
- **Baldur Sanjin** - Nordic

### Eastern European / Đông Âu
- **Lidiya Szekeres** - Eastern European
- **Szofi Granger** - Hungarian
- **Barbora MacLean** - Czech
- **Damjan Chapman** - Eastern European
- **Viktor Eka** - Eastern European
- **Viktor Menelaos** - Eastern European

### Asian / Châu Á
- **Alexandra Hisakawa** - Japanese
- **Kazuhiko Atallah** - Japanese
- **Royston Min** - Chinese/Korean
- **Xavier Hayasaka** - Japanese

### Middle Eastern / Trung Đông
- **Badr Odhiambo** - Middle Eastern/African
- **Suad Qasim** - Middle Eastern
- **Eugenio Mataracı** - Turkish

### Other / Khác
- **Asya Anara** - Russian/Central Asian
- **Ilkin Urbano** - Turkish/Central Asian
- **Ferran Simen** - Catalan/Spanish
- **Filip Traverse** - Various
- **Kumar Dahl** - Indian
- **Torcull Diarmuid** - Celtic
- **Zacharie Aimilios** - Greek

---

## 📝 Notes / Ghi chú

### Metadata Availability / Tính Khả dụng của Metadata

**Official metadata is not publicly available** for individual speakers. The speaker names are the primary identifiers, and characteristics (gender, accent, language) are inferred from naming patterns.

**Metadata chính thức không có sẵn công khai** cho từng giọng nói. Tên giọng nói là định danh chính, và đặc điểm (giới tính, giọng điệu, ngôn ngữ) được suy luận từ mẫu đặt tên.

### Usage / Cách sử dụng

All speakers work with all **17 supported languages** in XTTS-v2:
- English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Polish (pl), Turkish (tr), Russian (ru), Dutch (nl), Czech (cs), Arabic (ar), Chinese (zh-cn), Hungarian (hu), Korean (ko), Japanese (ja), Hindi (hi)

Tất cả giọng nói hoạt động với tất cả **17 ngôn ngữ được hỗ trợ** trong XTTS-v2.

### Example Usage / Ví dụ Sử dụng

```python
from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
tts.to("cuda")

# Use any speaker with any language
tts.tts_to_file(
    text="Hello, this is a test.",
    speaker="Claribel Dervla",
    language="en",
    file_path="output.wav"
)

# Cross-language voice cloning
tts.tts_to_file(
    text="Hola, esto es una prueba.",
    speaker="Claribel Dervla",  # English speaker speaking Spanish
    language="es",
    file_path="output_spanish.wav"
)
```

---

## 🔍 How to Get Speaker List Programmatically / Cách Lấy Danh sách Giọng nói Theo Chương trình

```python
from TTS.api import TTS
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

# Get all speakers
speakers = tts.speakers
print(f"Total speakers: {len(speakers)}")
for i, speaker in enumerate(speakers, 1):
    print(f"{i}. {speaker}")
```

---

## 📚 References / Tài liệu Tham khảo

- [Coqui TTS XTTS-v2 Documentation](https://docs.coqui.ai/en/latest/models/xtts.html)
- [XTTS-v2 Model Card](https://huggingface.co/coqui/XTTS-v2)
- Coqui TTS GitHub: https://github.com/coqui-ai/TTS

---

**Last Updated:** 2024-12-19  
**Total Speakers:** 58  
**Supported Languages:** 17

