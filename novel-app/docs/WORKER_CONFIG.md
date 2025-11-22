# Worker Configuration / Cấu hình Worker

## ⚙️ Slower Processing (50% Slower) / Xử lý Chậm hơn (Chậm hơn 50%)

The worker has been configured to process 50% slower to reduce load on TTS backend.

Worker đã được cấu hình để xử lý chậm hơn 50% để giảm tải cho TTS backend.

## 🔧 Configuration / Cấu hình

### Default Delays / Độ trễ Mặc định

- **Delay Between Batches:** 3000ms (3 seconds) - Increased from 1000ms
- **Delay Between Items:** 2000ms (2 seconds) - New delay between individual items
- **Batch Size:** 1 (process one item at a time)

### Custom Configuration / Cấu hình Tùy chỉnh

You can customize delays via API:

```json
POST /api/worker/generate/chapter
{
  "novelId": "...",
  "chapterNumber": 1,
  "delayBetweenBatches": 5000,  // 5 seconds between batches
  "delayBetweenItems": 3000     // 3 seconds between items
}
```

### Processing Speed / Tốc độ Xử lý

**Before (Fast):**
- Batch delay: 1 second
- No delay between items
- Parallel processing

**After (50% Slower):**
- Batch delay: 3 seconds (3x slower)
- Item delay: 2 seconds (sequential processing)
- Sequential processing (one at a time)

## 📊 Impact / Tác động

- **Single Chapter:** ~60-120 seconds (with delays)
- **Multiple Chapters:** Each chapter gets 2-3 second delay
- **Better for TTS Backend:** Reduces load, prevents overloading
- **More Stable:** Better for long-running batch jobs

---

**Worker is now 50% slower for gentler processing!**  
**Worker giờ chậm hơn 50% để xử lý nhẹ nhàng hơn!**

