# VieNeu-TTS Long Text Generation Review / Đánh giá Tạo Giọng Dài cho VieNeu-TTS

## 📋 How It Works / Cách hoạt động

### 1. Text Chunking Strategy / Chiến lược Chia nhỏ Văn bản

The `infer_long_text.py` uses a **smart chunking strategy**:

`infer_long_text.py` sử dụng **chiến lược chia nhỏ thông minh**:

```python
def split_text_into_chunks(text: str, max_chars: int = 256) -> List[str]:
    """
    Split raw text into chunks no longer than max_chars.
    Preference is given to sentence boundaries; otherwise falls back to word-based splitting.
    """
```

**Key Points / Điểm chính:**
- **Default max: 256 characters** per chunk
- **Priority 1:** Split at sentence boundaries (`. ! ? …`)
- **Priority 2:** If sentence fits, try to combine multiple sentences
- **Priority 3:** If sentence too long, split by words

**Điểm chính:**
- **Mặc định tối đa: 256 ký tự** mỗi chunk
- **Ưu tiên 1:** Chia tại ranh giới câu (`. ! ? …`)
- **Ưu tiên 2:** Nếu câu vừa, thử kết hợp nhiều câu
- **Ưu tiên 3:** Nếu câu quá dài, chia theo từ

### 2. Why 256 Characters? / Tại sao 256 Ký tự?

**Context Window Limit / Giới hạn Cửa sổ Ngữ cảnh:**
- VieNeu-TTS has `max_context = 2048` tokens
- Needs to reserve tokens for:
  - Reference text (`ref_text`)
  - Reference audio codes (`ref_codes`)
  - Generated text tokens
- 256 chars ≈ **safe limit** to stay within 2048 token context window

**Giới hạn Cửa sổ Ngữ cảnh:**
- VieNeu-TTS có `max_context = 2048` tokens
- Cần dành tokens cho:
  - Văn bản tham chiếu (`ref_text`)
  - Mã audio tham chiếu (`ref_codes`)
  - Tokens văn bản được tạo
- 256 ký tự ≈ **giới hạn an toàn** để ở trong cửa sổ ngữ cảnh 2048 tokens

### 3. Generation Process / Quá trình Tạo

```python
# 1. Split text into chunks
chunks = split_text_into_chunks(raw_text, max_chars=256)

# 2. Encode reference audio ONCE (same for all chunks)
ref_codes = tts.encode_reference(ref_audio_path)

# 3. Generate each chunk sequentially
for chunk in chunks:
    wav = tts.infer(chunk, ref_codes, ref_text_raw)  # Same ref_codes!
    generated_segments.append(wav)

# 4. Concatenate all segments
combined_audio = np.concatenate(generated_segments)
```

**Key Insight / Thông tin Quan trọng:**
- **Encode reference audio ONCE** - saves computation
- **Use same `ref_codes` for all chunks** - maintains consistent voice
- **Concatenate audio segments** - seamless long-form audio

**Thông tin Quan trọng:**
- **Mã hóa audio tham chiếu MỘT LẦN** - tiết kiệm tính toán
- **Sử dụng cùng `ref_codes` cho tất cả chunks** - duy trì giọng nhất quán
- **Nối các đoạn audio** - audio dài liền mạch

### 4. Chunking Algorithm / Thuật toán Chia nhỏ

```python
# Step 1: Split by sentences
sentences = re.split(r"(?<=[\.\!\?\…])\s+", text)

# Step 2: Try to combine sentences that fit
for sentence in sentences:
    if len(sentence) <= max_chars:
        candidate = buffer + " " + sentence
        if len(candidate) <= max_chars:
            buffer = candidate  # Combine!
        else:
            flush_buffer()  # Too long, save previous
            buffer = sentence

# Step 3: If sentence too long, split by words
if len(sentence) > max_chars:
    words = sentence.split()
    # Create word-based chunks
```

**Benefits / Lợi ích:**
- ✅ Natural breaks at sentence boundaries (better prosody)
- ✅ Efficient chunk sizes (combines when possible)
- ✅ Handles very long sentences (word fallback)
- ✅ Preserves text structure

**Lợi ích:**
- ✅ Ngắt tự nhiên tại ranh giới câu (ngữ điệu tốt hơn)
- ✅ Kích thước chunk hiệu quả (kết hợp khi có thể)
- ✅ Xử lý câu rất dài (dự phòng theo từ)
- ✅ Giữ nguyên cấu trúc văn bản

### 5. Example Usage / Ví dụ Sử dụng

```bash
# From VieNeu-TTS repo
python -m examples.infer_long_text \
  --text-file examples/sample_long_text.txt \
  --ref-audio sample/id_0002.wav \
  --ref-text sample/id_0002.txt \
  --output output_audio/long_text.wav \
  --max-chars 256
```

**Parameters / Tham số:**
- `--text-file` or `--text`: Input text
- `--ref-audio`: Reference audio (.wav)
- `--ref-text`: Reference text (must match ref-audio)
- `--output`: Combined output audio
- `--max-chars`: Max characters per chunk (default: 256)
- `--chunk-output-dir`: Optional directory to save individual chunks

## 🔧 Integration into Backend / Tích hợp vào Backend

To support long text in the backend API, we should:

Để hỗ trợ văn bản dài trong API backend, chúng ta nên:

1. **Add chunking utility** to `voice_selector.py` or new file
2. **Modify API endpoint** to detect long text and auto-chunk
3. **Reuse ref_codes** for all chunks (performance optimization)
4. **Concatenate segments** before returning

1. **Thêm tiện ích chunking** vào `voice_selector.py` hoặc file mới
2. **Sửa endpoint API** để phát hiện văn bản dài và tự động chia nhỏ
3. **Tái sử dụng ref_codes** cho tất cả chunks (tối ưu hiệu suất)
4. **Nối các đoạn** trước khi trả về

## 📊 Performance Considerations / Cân nhắc Hiệu suất

**Current Approach / Cách tiếp cận Hiện tại:**
- Sequential generation (one chunk at a time)
- Same ref_codes for all chunks (good!)
- No overlap between chunks (may cause slight discontinuity)

**Optimizations / Tối ưu hóa:**
- Could add overlap/add between chunks (like streaming)
- Could parallelize generation (but needs different ref_codes per chunk)
- Current approach is **simple and reliable**

**Cách tiếp cận Hiện tại:**
- Tạo tuần tự (một chunk tại một thời điểm)
- Cùng ref_codes cho tất cả chunks (tốt!)
- Không có chồng chéo giữa chunks (có thể gây gián đoạn nhẹ)

**Tối ưu hóa:**
- Có thể thêm overlap/add giữa chunks (như streaming)
- Có thể song song hóa tạo (nhưng cần ref_codes khác nhau cho mỗi chunk)
- Cách tiếp cận hiện tại là **đơn giản và đáng tin cậy**

## ✅ Recommendations / Khuyến nghị

1. **Use 256 chars as default** - proven safe limit
2. **Reuse ref_codes** - significant performance boost
3. **Split at sentences** - better prosody/intonation
4. **Handle edge cases** - very long words, no punctuation

1. **Sử dụng 256 ký tự làm mặc định** - giới hạn an toàn đã được chứng minh
2. **Tái sử dụng ref_codes** - tăng hiệu suất đáng kể
3. **Chia tại câu** - ngữ điệu/ngữ điệu tốt hơn
4. **Xử lý trường hợp đặc biệt** - từ rất dài, không có dấu câu

