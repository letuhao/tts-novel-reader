# VietTTS Concurrent Inference Analysis
# Phân tích Inference Đồng thời của VietTTS

## Problem / Vấn đề

When multiple requests come in simultaneously, the TTS backend crashes. The question is:
**Can VietTTS model support multiple concurrent inference flows, or is it fundamentally single-threaded?**

Khi nhiều request đến đồng thời, TTS backend bị crash. Câu hỏi là:
**Model VietTTS có hỗ trợ nhiều luồng inference đồng thời không, hay về cơ bản chỉ single-threaded?**

## Model Architecture Analysis / Phân tích Kiến trúc Model

### Current Implementation / Triển khai Hiện tại

1. **Single Model Instance** / Một Instance Model:
   ```python
   # tts/dangvansam-VietTTS-backend/tts_backend/models/viet_tts.py
   class VietTTSWrapper:
       def __init__(self):
           self.model = TTS(...)  # ONE instance for all requests
   ```

2. **TTS Class Structure** / Cấu trúc Class TTS:
   ```python
   # tts/viet-tts/viettts/tts.py
   class TTS:
       def __init__(self):
           self.frontend = TTSFrontEnd(...)  # ONNX models (speech_embedding, speech_tokenizer)
           self.model = TTSModel(...)        # PyTorch models (llm, flow, hift)
   ```

3. **Model Components** / Các Thành phần Model:
   - `TTSModel`: Contains PyTorch models (llm, flow, hift) - set to `.eval()` mode
   - `TTSFrontEnd`: Contains ONNX models (speech_embedding.onnx, speech_tokenizer.onnx)

### PyTorch Model Thread Safety / Tính An toàn Thread của PyTorch Model

**Theory / Lý thuyết:**
- PyTorch models in `.eval()` mode with `torch.no_grad()` are **generally thread-safe** for inference
- PyTorch models ở chế độ `.eval()` với `torch.no_grad()` **thường thread-safe** cho inference

**Reality / Thực tế:**
- ❌ **ONNX Runtime sessions** (in `TTSFrontEnd`) are **NOT thread-safe by default**
  - ONNX Runtime sessions (trong `TTSFrontEnd`) **KHÔNG thread-safe** theo mặc định
- ⚠️ **CUDA streams conflicts**: Multiple threads using GPU simultaneously can cause conflicts
  - Xung đột CUDA streams: Nhiều thread dùng GPU đồng thời có thể gây xung đột
- ⚠️ **Memory allocation**: Concurrent GPU memory allocation can cause issues
  - Cấp phát bộ nhớ: Cấp phát bộ nhớ GPU đồng thời có thể gây vấn đề

## Options / Các Tùy chọn

### Option 1: Multiple Model Instances / Nhiều Instance Model

**Approach / Cách tiếp cận:**
Create a pool of model instances, one per concurrent request thread.

Tạo một pool các instance model, một instance cho mỗi thread request đồng thời.

**Pros / Ưu điểm:**
- ✅ True parallel processing / Xử lý song song thực sự
- ✅ Each request uses its own model instance / Mỗi request dùng instance model riêng
- ✅ No shared state / Không có state dùng chung

**Cons / Nhược điểm:**
- ❌ **High GPU memory usage**: Each instance loads full model to GPU (~7-10GB per instance)
  - Sử dụng GPU memory cao: Mỗi instance tải toàn bộ model lên GPU (~7-10GB mỗi instance)
- ❌ RTX 4090 has 24GB VRAM, so max 2-3 concurrent instances
  - RTX 4090 có 24GB VRAM, nên tối đa 2-3 instance đồng thời
- ❌ Model loading overhead for each instance
  - Overhead tải model cho mỗi instance

**Implementation / Triển khai:**
```python
class ModelPool:
    def __init__(self, pool_size=2):
        self.pool = queue.Queue()
        self.pool_size = pool_size
        for _ in range(pool_size):
            model = TTS(...)  # Load model to GPU
            self.pool.put(model)
    
    def get_model(self):
        return self.pool.get()
    
    def return_model(self, model):
        self.pool.put(model)
```

### Option 2: Request Queue with Single Model / Hàng đợi Request với Model Đơn

**Approach / Cách tiếp cận:**
Use a queue to serialize requests, but process them efficiently in sequence.

Dùng hàng đợi để serialize requests, nhưng xử lý chúng hiệu quả tuần tự.

**Pros / Ưu điểm:**
- ✅ Single model instance (low VRAM usage) / Một instance model (dùng ít VRAM)
- ✅ No thread safety issues / Không có vấn đề thread safety
- ✅ Simple implementation / Triển khai đơn giản

**Cons / Nhược điểm:**
- ❌ Requests processed sequentially (no true parallelism)
  - Requests được xử lý tuần tự (không có song song thực sự)
- ❌ Slower overall throughput
  - Throughput tổng thể chậm hơn

**Implementation / Triển khai:**
```python
# Already implemented with threading.Lock (current approach)
with self._inference_lock:
    return self.model.tts_to_wav(...)
```

### Option 3: ONNX Session Thread-Safe Configuration / Cấu hình ONNX Session Thread-Safe

**Approach / Cách tiếp cận:**
Configure ONNX Runtime to use thread-safe sessions.

Cấu hình ONNX Runtime để dùng sessions thread-safe.

**Pros / Ưu điểm:**
- ✅ Can keep single model instance / Có thể giữ một instance model
- ✅ Potentially allows concurrent inference / Có khả năng cho phép inference đồng thời

**Cons / Nhược điểm:**
- ❌ ONNX Runtime thread-safety is complex / Tính thread-safe của ONNX Runtime phức tạp
- ❌ May require modifying VietTTS source code / Có thể cần sửa source code VietTTS
- ❌ May still have CUDA stream conflicts / Có thể vẫn có xung đột CUDA stream

**Implementation / Triển khai:**
```python
# Need to modify tts/viet-tts/viettts/frontend.py
# Create ONNX sessions with thread-safe options
session_options = onnxruntime.SessionOptions()
session_options.intra_op_num_threads = 1
session_options.inter_op_num_threads = 1
session_options.execution_mode = onnxruntime.ExecutionMode.ORT_SEQUENTIAL
```

### Option 4: Batch Processing / Xử lý Batch

**Approach / Cách tiếp cận:**
Instead of concurrent requests, batch multiple texts into a single inference call.

Thay vì requests đồng thời, batch nhiều text vào một lời gọi inference.

**Pros / Ưu điểm:**
- ✅ More efficient GPU utilization / Sử dụng GPU hiệu quả hơn
- ✅ Model can process multiple items in one forward pass / Model có thể xử lý nhiều item trong một forward pass
- ✅ Better throughput than sequential processing / Throughput tốt hơn xử lý tuần tự

**Cons / Nhược điểm:**
- ❌ Requires modifying VietTTS to support batch inference / Cần sửa VietTTS để hỗ trợ batch inference
- ❌ Request must wait for batch to fill / Request phải đợi batch đầy
- ❌ Complex implementation / Triển khai phức tạp

## Recommendation / Khuyến nghị

### For Current Setup (RTX 4090, 24GB VRAM) / Cho Setup Hiện tại

**Best Option: Model Pool with 2 Instances / Tùy chọn Tốt nhất: Model Pool với 2 Instances**

1. **Create 2 model instances** / Tạo 2 instance model:
   - Each instance uses ~7-10GB VRAM
   - Mỗi instance dùng ~7-10GB VRAM
   - Total: ~14-20GB VRAM (fits in 24GB)
   - Tổng: ~14-20GB VRAM (vừa trong 24GB)

2. **Request queue system** / Hệ thống hàng đợi request:
   - Worker threads pick up requests from queue
   - Thread worker lấy requests từ hàng đợi
   - Each worker gets a model instance from pool
   - Mỗi worker lấy một instance model từ pool
   - Process up to 2 requests concurrently
   - Xử lý tối đa 2 requests đồng thời

3. **Fallback to queue** / Dự phòng hàng đợi:
   - If pool is full, queue request for later
   - Nếu pool đầy, đưa request vào hàng đợi

**Expected Performance / Hiệu suất Dự kiến:**
- 2x throughput compared to sequential processing
- Throughput gấp 2 lần so với xử lý tuần tự
- No crashes from concurrent access
- Không bị crash từ truy cập đồng thời
- Optimal GPU utilization (~70-90%)
- Sử dụng GPU tối ưu (~70-90%)

### Alternative: Keep Current Lock (Simpler) / Thay thế: Giữ Lock Hiện tại (Đơn giản hơn)

If implementing a model pool is too complex, the current lock-based approach is acceptable:
- Requests processed sequentially
- No crashes
- Simpler code
- Slower overall throughput

Nếu triển khai model pool quá phức tạp, cách tiếp cận dựa trên lock hiện tại là chấp nhận được:
- Requests được xử lý tuần tự
- Không bị crash
- Code đơn giản hơn
- Throughput tổng thể chậm hơn

## Conclusion / Kết luận

**Answer to the question / Trả lời câu hỏi:**
- VietTTS model CAN support concurrent inference with multiple instances
- Model VietTTS CÓ THỂ hỗ trợ inference đồng thời với nhiều instance
- However, it requires **multiple model instances** (high VRAM)
- Tuy nhiên, nó cần **nhiều instance model** (VRAM cao)
- Single instance is NOT thread-safe due to ONNX Runtime sessions
- Instance đơn KHÔNG thread-safe do ONNX Runtime sessions

**Best Solution / Giải pháp Tốt nhất:**
Model Pool with 2 instances for RTX 4090 (optimal balance of parallelism and VRAM usage).

Model Pool với 2 instance cho RTX 4090 (cân bằng tối ưu giữa song song và sử dụng VRAM).

