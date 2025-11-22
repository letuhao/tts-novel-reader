# Audio Enhancement Settings / Cài đặt Nâng cấp Audio

## Overview / Tổng quan

The Dia TTS wrapper now includes several audio enhancement features to improve output quality:
Wrapper Dia TTS giờ đã bao gồm nhiều tính năng nâng cấp audio để cải thiện chất lượng đầu ra:

## Features / Tính năng

### 1. Silence Trimming / Cắt Im lặng

**Purpose / Mục đích:**
- Removes long empty spaces at the beginning and end of generated audio
- Loại bỏ khoảng trống dài ở đầu và cuối audio được tạo

**Settings / Cài đặt:**
- `trim_silence`: `bool` (default: `True`) - Enable/disable trimming
- `silence_threshold`: `float` (default: `0.01`) - Amplitude threshold to detect silence
- `silence_margin`: `int` (default: `1000`) - Samples to keep around sound (prevents cutting too aggressively)

**Example / Ví dụ:**
```python
wav = dia_tts.synthesize(
    text="Hello world",
    trim_silence=True,
    silence_threshold=0.01,  # 1% amplitude = silence
    silence_margin=1000      # Keep ~23ms margin at 44.1kHz
)
```

### 2. Audio Normalization / Chuẩn hóa Audio

**Purpose / Mục đích:**
- Ensures consistent volume levels across all generated audio
- Prevents clipping and ensures audio is at optimal level
- Đảm bảo mức âm lượng nhất quán trên tất cả audio được tạo
- Ngăn chặn clipping và đảm bảo audio ở mức tối ưu

**Settings / Cài đặt:**
- `normalize`: `bool` (default: `True`) - Enable/disable normalization
- `normalize_target_db`: `float` (default: `-3.0`) - Target dB level (negative value, e.g., -3.0 for -3dB)
- `max_peak`: `float` (default: `0.95`) - Maximum peak value to prevent clipping (0.0-1.0)

**Why -3.0 dB? / Tại sao -3.0 dB?**
- Leaves headroom for audio processing
- Prevents clipping in subsequent processing
- Standard practice for audio production
- Để lại khoảng trống cho xử lý audio
- Ngăn chặn clipping trong xử lý tiếp theo
- Thực hành chuẩn cho sản xuất audio

**Example / Ví dụ:**
```python
wav = dia_tts.synthesize(
    text="Hello world",
    normalize=True,
    normalize_target_db=-3.0,  # -3dB peak level
    max_peak=0.95              # Prevent clipping at 95% peak
)
```

### 3. Audio Format Validation / Xác thực Định dạng Audio

**Purpose / Mục đích:**
- Ensures audio is in correct format (float32, mono, [-1, 1] range)
- Automatically converts formats if needed
- Đảm bảo audio ở định dạng đúng (float32, mono, khoảng [-1, 1])
- Tự động chuyển đổi định dạng nếu cần

**What it does / Nó làm gì:**
- Converts to `float32` if needed
- Converts stereo to mono (averages channels)
- Clamps values to [-1.0, 1.0] range
- Chuyển sang `float32` nếu cần
- Chuyển stereo sang mono (lấy trung bình các kênh)
- Giới hạn giá trị trong khoảng [-1.0, 1.0]

**Note / Lưu ý:**
- This is applied automatically before other processing
- Được áp dụng tự động trước các xử lý khác

## Processing Order / Thứ tự Xử lý

The audio processing pipeline follows this order:
Pipeline xử lý audio theo thứ tự sau:

1. **Generate audio** from model / Tạo audio từ model
2. **Format validation** - Ensure correct format / Xác thực định dạng
3. **Trim silence** - Remove empty spaces / Cắt im lặng
4. **Normalize** - Adjust volume levels / Chuẩn hóa mức âm lượng
5. **Speed adjustment** - Apply speed factor (if needed) / Điều chỉnh tốc độ

## Best Practices / Thực hành Tốt nhất

### For Novel Narration / Cho Đọc Truyện:
```python
wav = dia_tts.synthesize(
    text="[05] Text content here",
    temperature=1.3,
    top_p=0.95,
    cfg_scale=3.0,
    speed_factor=1.0,           # Normal speed
    trim_silence=True,          # Remove empty spaces
    silence_threshold=0.01,     # Standard threshold
    silence_margin=1000,        # ~23ms margin at 44.1kHz
    normalize=True,             # Consistent volume
    normalize_target_db=-3.0,   # -3dB peak level
    max_peak=0.95              # Prevent clipping
)
```

### For Faster Processing / Cho Xử lý Nhanh hơn:
```python
# Disable normalization if you have consistent input
wav = dia_tts.synthesize(
    text="[05] Text",
    trim_silence=True,
    normalize=False  # Skip normalization for speed
)
```

### For Maximum Quality / Cho Chất lượng Tối đa:
```python
wav = dia_tts.synthesize(
    text="[05] Text",
    trim_silence=True,
    silence_threshold=0.005,    # More sensitive (removes quieter silence)
    silence_margin=2000,        # Larger margin (more natural)
    normalize=True,
    normalize_target_db=-2.0,   # Higher target level (closer to 0dB)
    max_peak=0.98              # Tighter clipping prevention
)
```

## API Integration / Tích hợp API

To use these features via the API, add parameters to the request:
Để sử dụng các tính năng này qua API, thêm tham số vào request:

```json
{
  "text": "[05] Your text here",
  "model": "dia",
  "trim_silence": true,
  "silence_threshold": 0.01,
  "silence_margin": 1000,
  "normalize": true,
  "normalize_target_db": -3.0,
  "max_peak": 0.95
}
```

**Note:** These parameters will be passed through to the Dia TTS wrapper automatically.

## Technical Details / Chi tiết Kỹ thuật

### Silence Detection / Phát hiện Im lặng

The silence detection algorithm:
Thuật toán phát hiện im lặng:

1. Calculates absolute amplitude of audio / Tính toán biên độ tuyệt đối của audio
2. Finds samples where amplitude > threshold / Tìm các mẫu nơi biên độ > ngưỡng
3. Keeps margin samples before/after sound / Giữ các mẫu margin trước/sau âm thanh

**Threshold values / Giá trị ngưỡng:**
- `0.01` (default) - Standard silence detection
- `0.005` - More sensitive (removes quieter silence)
- `0.02` - Less sensitive (keeps more quiet parts)

### Normalization / Chuẩn hóa

The normalization process:
Quá trình chuẩn hóa:

1. Prevents clipping by scaling down if max peak > `max_peak`
2. Scales audio to target dB level if `normalize_target_db` is set
3. Ensures final audio doesn't exceed `max_peak`

**Formula / Công thức:**
```
target_linear = 10 ** (target_db / 20.0)
scale_factor = target_linear / current_max
audio_normalized = audio * scale_factor
```

## References / Tham khảo

- Dia TTS Repository: `tts/Dia-Finetuning-Vietnamese/`
- Original implementation: `app_local.py` - `trim_silence()` function
- Audio processing best practices for TTS systems

