# VieNeu-TTS Performance Optimizations
# Tối ưu hóa Hiệu suất VieNeu-TTS

## ✅ Optimizations Applied / Tối ưu hóa đã Áp dụng

### 1. **TF32 (TensorFloat-32)**
- **Status:** ✅ Enabled for RTX 4090 (Ampere architecture)
- **Trạng thái:** ✅ Đã bật cho RTX 4090 (kiến trúc Ampere)
- **Impact:** ~1.5-2x faster matrix multiplications
- **Tác động:** ~1.5-2x nhanh hơn cho các phép nhân ma trận
- **Code:** `torch.backends.cuda.matmul.allow_tf32 = True`

### 2. **FP16 (Half Precision)**
- **Status:** ✅ Enabled via autocast
- **Trạng thái:** ✅ Đã bật qua autocast
- **Impact:** ~2x faster inference, ~50% less VRAM
- **Tác động:** ~2x nhanh hơn inference, ~50% ít VRAM hơn
- **Code:** `torch.cuda.amp.autocast(dtype=torch.float16)`

### 3. **torch.compile**
- **Status:** ✅ Enabled for backbone model
- **Trạng thái:** ✅ Đã bật cho backbone model
- **Impact:** ~20-30% speedup on top of other optimizations
- **Tác động:** ~20-30% tăng tốc thêm vào các tối ưu hóa khác
- **Code:** `torch.compile(model, backend="inductor", mode="reduce-overhead")`

### 4. **Flash Attention**
- **Status:** ✅ Enabled if available
- **Trạng thái:** ✅ Đã bật nếu khả dụng
- **Impact:** Faster attention operations, less memory
- **Tác động:** Các phép toán attention nhanh hơn, ít bộ nhớ hơn
- **Code:** `sdpa_kernel(backends=[SDPBackend.FLASH_ATTENTION])`

## 📊 Expected Performance Improvements / Cải thiện Hiệu suất Mong đợi

### Before Optimizations / Trước Tối ưu hóa:
- GPU Utilization: 90%
- Speed: 2-4x slower than realtime
- **Tốc độ:** Chậm hơn 2-4 lần so với realtime

### After Optimizations / Sau Tối ưu hóa:
- **TF32:** +50-100% faster matmul operations
- **FP16:** +100% faster inference, 50% less VRAM
- **torch.compile:** +20-30% additional speedup
- **Flash Attention:** +10-20% faster attention (if supported)
- **Combined:** Should reach **realtime or faster** on RTX 4090
- **Tổng hợp:** Nên đạt **realtime hoặc nhanh hơn** trên RTX 4090

## ⚠️ Important Notes / Lưu ý Quan trọng

1. **First Call May Be Slow:** torch.compile requires a "warmup" call to compile the model
   - **Lần gọi đầu có thể chậm:** torch.compile cần một lần "warmup" để biên dịch model
   - This is normal - subsequent calls will be much faster
   - Điều này là bình thường - các lần gọi sau sẽ nhanh hơn nhiều

2. **FP16 Precision:** Half precision may cause minor quality differences
   - **FP16 Precision:** Half precision có thể gây khác biệt chất lượng nhỏ
   - Usually imperceptible for TTS
   - Thường không nhận biết được cho TTS

3. **Flash Attention:** Requires compatible PyTorch version and CUDA
   - **Flash Attention:** Cần phiên bản PyTorch và CUDA tương thích
   - Falls back to standard attention if not available
   - Quay về attention tiêu chuẩn nếu không khả dụng

## 🔧 How to Disable Optimizations / Cách Tắt Tối ưu hóa

If you encounter issues, you can disable optimizations:

Nếu gặp vấn đề, bạn có thể tắt tối ưu hóa:

```python
# In vieneu_tts.py, comment out:
# Trong vieneu_tts.py, comment out:

# if self.device == "cuda":
#     self._setup_cuda_optimizations()
#     self._apply_model_optimizations()
```

## 🚀 Usage / Sử dụng

Optimizations are **automatically enabled** when:
- Device is CUDA (GPU detected)
- PyTorch supports the features (torch.compile, Flash Attention)

Tối ưu hóa được **tự động bật** khi:
- Device là CUDA (phát hiện GPU)
- PyTorch hỗ trợ các tính năng (torch.compile, Flash Attention)

No manual configuration needed!

Không cần cấu hình thủ công!

