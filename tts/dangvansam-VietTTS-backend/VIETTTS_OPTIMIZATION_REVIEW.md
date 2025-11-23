# VietTTS Performance Optimization Review
# Đánh giá Tối ưu hóa Hiệu suất VietTTS

## Current Performance / Hiệu suất Hiện tại
- **Audio Duration:** 45 seconds
- **Generation Time:** 64 seconds  
- **Realtime Ratio:** 1.4x (64s / 45s)
- **GPU Utilization:** Variable (0-90%), drops to 0% between chunks

## Issue Analysis / Phân tích Vấn đề

### Root Cause / Nguyên nhân Gốc
1. **Text Splitting:** Text is split into ~12 chunks internally by `split_text()` function
   - **Chunking:** Text được tách thành ~12 chunks nội bộ bởi hàm `split_text()`
2. **Sequential Processing:** Each chunk processed one at a time in `inference_tts()`
   - **Xử lý Tuần tự:** Mỗi chunk được xử lý lần lượt trong `inference_tts()`
3. **GPU Idle Time:** GPU goes idle between chunks due to:
   - **Thời gian GPU Idle:** GPU bị idle giữa các chunks do:
     - Python loop overhead / Overhead vòng lặp Python
     - Text preprocessing / Preprocessing text
     - Memory allocation / Cấp phát bộ nhớ
     - CPU-GPU synchronization / Đồng bộ CPU-GPU

### Code Flow / Luồng Code
```python
# tts/viet-tts/viettts/tts.py
def inference_tts(self, tts_text, prompt_speech_16k, stream=False, speed=1.0):
    for i in tqdm(self.frontend.preprocess_text(tts_text, split=True)):  # Sequential loop
        model_input = self.frontend.frontend_tts(i, prompt_speech_16k)
        for model_output in self.model.tts(**model_input, stream=stream, speed=speed):
            yield model_output

def tts_to_wav(self, text, prompt_speech_16k, speed=1.0):
    wavs = []
    for output in self.inference_tts(text, prompt_speech_16k, stream=False, speed=speed):
        wavs.append(output['tts_speech'].squeeze(0).numpy())
    return np.concatenate(wavs, axis=0)
```

## Optimization Options / Tùy chọn Tối ưu hóa

### Option 1: CUDA Streams (Advanced) / Luồng CUDA (Nâng cao)
**Pros:**
- Overlap computation and data transfer / Chồng chéo tính toán và truyền dữ liệu
- Process chunks in parallel streams / Xử lý chunks trong các luồng song song

**Cons:**
- Requires modifying core VietTTS code / Cần sửa code core VietTTS
- Complex implementation / Triển khai phức tạp
- May cause memory issues / Có thể gây vấn đề bộ nhớ

### Option 2: Pre-process Chunks (Recommended) / Pre-process Chunks (Đề xuất)
**Pros:**
- Pre-process all chunks upfront / Pre-process tất cả chunks trước
- Reduce preprocessing overhead between chunks / Giảm overhead preprocessing giữa chunks
- Simple to implement / Dễ triển khai

**Implementation:**
```python
# Pre-process all chunks at once
chunks = list(self.model.frontend.preprocess_text(text, split=True))

# Process with minimal overhead
wavs = []
for chunk in chunks:
    model_input = self.model.frontend.frontend_tts(chunk, prompt_speech)
    with torch.no_grad():
        output = self.model.tts(**model_input, stream=False, speed=speed)
        wavs.append(output['tts_speech'].squeeze(0).numpy())
    
    # Keep GPU warm (small operation)
    if torch.cuda.is_available():
        torch.cuda.empty_cache()  # Clear cache if needed
        
wav = np.concatenate(wavs, axis=0)
```

### Option 3: Larger Chunk Size / Kích thước Chunk Lớn hơn
**Pros:**
- Fewer chunks = less overhead / Ít chunks hơn = ít overhead hơn
- Better GPU utilization / Sử dụng GPU tốt hơn

**Cons:**
- May exceed model limits / Có thể vượt giới hạn model
- Need to modify `split_text()` parameters / Cần sửa tham số `split_text()`

**Current Parameters:**
```python
# tts/viet-tts/viettts/frontend.py:174-184
text = list(split_text(
    text=text,
    tokenize=partial(self.tokenizer.encode, allowed_special='all'),
    token_max_n=30,  # Max tokens per chunk
    token_min_n=10,  # Min tokens per chunk
    merge_len=5,     # Merge if less than 5 tokens
    comma_split=False
))
```

**Suggested:** Increase `token_max_n` to 40-50 (if model supports)
**Đề xuất:** Tăng `token_max_n` lên 40-50 (nếu model hỗ trợ)

### Option 4: JIT/ONNX Optimization / Tối ưu JIT/ONNX
**Current Status:**
```python
# tts/dangvansam-VietTTS-backend/tts_backend/models/viet_tts.py:130-134
self.model = TTS(
    model_dir=self.model_path,
    load_jit=False,   # Disabled
    load_onnx=False   # Disabled
)
```

**Enable JIT/ONNX for faster inference:**
- `load_jit=True`: JIT compiled models (faster on GPU)
- `load_onnx=True`: ONNX Runtime (optimized inference)

**Note:** May require model files (`llm.text_encoder.fp16.zip`, etc.)
**Lưu ý:** Có thể cần file model (`llm.text_encoder.fp16.zip`, v.v.)

## Recommended Approach / Phương pháp Đề xuất

### Immediate (Easy) / Ngay lập tức (Dễ)
1. ✅ **Enable TF32** - Already done
   - **Đã bật TF32** - Đã hoàn thành
2. ✅ **Pre-process chunks** - Implement Option 2
   - **Pre-process chunks** - Triển khai Option 2
3. ⚠️ **Enable JIT/ONNX** - Test if model files exist
   - **Bật JIT/ONNX** - Kiểm tra nếu file model tồn tại

### Future (Advanced) / Tương lai (Nâng cao)
1. **CUDA Streams** - Parallel chunk processing
   - **Luồng CUDA** - Xử lý chunks song song
2. **Increase chunk size** - Reduce number of chunks
   - **Tăng kích thước chunk** - Giảm số lượng chunks
3. **Batch inference** - Process multiple chunks simultaneously
   - **Inference batch** - Xử lý nhiều chunks cùng lúc

## Expected Improvements / Cải thiện Dự kiến

### With Pre-processing (Option 2) / Với Pre-processing (Option 2)
- **GPU Utilization:** 0-90% → 50-85% (more sustained)
- **Generation Time:** 64s → ~55-60s (10-15% faster)
- **Realtime Ratio:** 1.4x → ~1.2-1.3x

### With JIT/ONNX Enabled / Với JIT/ONNX Bật
- **Generation Time:** 55-60s → ~45-50s (20-30% faster)
- **Realtime Ratio:** 1.4x → ~1.0-1.1x (near realtime!)

### With Larger Chunks (Option 3) / Với Chunks Lớn hơn (Option 3)
- **Fewer chunks:** 12 chunks → 6-8 chunks
- **Less overhead:** Reduced idle time between chunks
- **Generation Time:** 64s → ~50-55s (15-20% faster)

## Testing / Kiểm thử

### Test Command / Lệnh Test
```bash
curl --location 'http://127.0.0.1:11111/api/tts/synthesize' \
--header 'Content-Type: application/json' \
--data '{
    "text": "Your long text here...",
    "voice": "quynh",
    "speed": 1.0
}'
```

### Monitor GPU / Giám sát GPU
```bash
# Watch GPU utilization
nvidia-smi -l 1

# Or use task manager Performance tab
```

## Notes / Ghi chú

1. **Current implementation is already good** - 1.4x realtime is acceptable
   - **Triển khai hiện tại đã tốt** - 1.4x realtime là chấp nhận được
2. **GPU idle is normal** - Some idle time between chunks is expected
   - **GPU idle là bình thường** - Một số thời gian idle giữa chunks là dự kiến
3. **Optimization vs Complexity** - Balance improvement vs code complexity
   - **Tối ưu vs Độ phức tạp** - Cân bằng cải thiện vs độ phức tạp code

## Additional Parameters / Tham số Bổ sung

### Available Parameters / Tham số Có sẵn
- `voice`: Voice name (quynh, cdteam, etc.)
- `speed`: Speech speed (0.5-2.0, default: 1.0)
- `store`: Store audio file (default: true)
- `return_audio`: Return audio in response (default: true)

### Potential Additions / Bổ sung Tiềm năng
- `token_max_n`: Max tokens per chunk (default: 30)
- `enable_jit`: Enable JIT optimization (default: false)
- `enable_onnx`: Enable ONNX optimization (default: false)
- `chunk_overlap`: Overlap between chunks for better continuity

