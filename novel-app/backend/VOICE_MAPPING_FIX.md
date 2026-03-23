# Voice Mapping Fix - Worker Voice Selection
# Sửa Lỗi Ánh Xạ Giọng - Lựa Chọn Giọng Worker

## Issue Found / Vấn Đề Tìm Thấy

### Problem / Vấn Đề
The worker was using `paragraph.voiceId` directly without mapping it through the enhanced voice mapping system. This caused issues when:

1. Role detection sets `paragraph.voiceId` to a voice from a different model (e.g., "quynh" from VietTTS)
2. Worker uses Coqui XTTS-v2 model
3. "quynh" is not a valid Coqui XTTS-v2 speaker name
4. Coqui TTS tries to use "quynh" as a voice cloning reference (looking for `.pth` file)
5. Error: `Voice file 'quynh.pth' for speaker 'quynh' not found`

### Root Cause / Nguyên Nhân
The worker code had this logic:
```javascript
if (paragraph.voiceId) {
  // Use voice from role detection
  selectedVoice = paragraph.voiceId;  // ❌ Direct use without mapping
} else if (paragraph.role) {
  // Use enhanced voice mapping
  selectedVoice = enhancedVoiceMapping.getVoiceForRoleSync(...);
}
```

**Problem:** When `paragraph.voiceId` exists, it bypasses the enhanced voice mapping, which means voices from different models (like VietTTS "quynh") are used directly with Coqui XTTS-v2.

---

## Fix Applied / Sửa Lỗi Đã Áp Dụng

### Solution / Giải Pháp
Always use enhanced voice mapping based on `paragraph.role`, even if `paragraph.voiceId` exists. This ensures:

1. ✅ Voice is always valid for the current model
2. ✅ Voices from different models are automatically mapped
3. ✅ Novel-specific voice mappings are respected
4. ✅ Assignment strategy (round-robin/manual) is applied

### Code Changes / Thay Đổi Mã

**File:** `novel-app/backend/src/services/worker.js`

**Before:**
```javascript
if (paragraph.voiceId) {
  selectedVoice = paragraph.voiceId;  // ❌ Direct use
} else if (paragraph.role) {
  selectedVoice = enhancedVoiceMapping.getVoiceForRoleSync(...);
}
```

**After:**
```javascript
// CRITICAL: Always use enhanced voice mapping to ensure voice is valid for current model
if (paragraph.role) {
  // Always map through enhanced voice mapping (ensures correct voice for current model)
  selectedVoice = enhancedVoiceMapping.getVoiceForRoleSync(paragraph.role, currentModel, novelId);
  // Log warning if voiceId mismatch (indicates cross-model voice)
  if (paragraph.voiceId && paragraph.voiceId !== selectedVoice) {
    console.log(`⚠️  Voice ID mismatch: "${paragraph.voiceId}" (from different model) → "${selectedVoice}" for ${currentModel}`);
  }
} else {
  // Fallback to narrator
  selectedVoice = enhancedVoiceMapping.getVoiceForRoleSync('narrator', currentModel, novelId);
}
```

---

## Expected Behavior After Fix / Hành Vi Mong Đợi Sau Khi Sửa

### Before Fix
- ❌ `paragraph.voiceId = "quynh"` (VietTTS voice)
- ❌ Worker uses "quynh" directly with Coqui XTTS-v2
- ❌ Error: `Voice file 'quynh.pth' not found`

### After Fix
- ✅ `paragraph.voiceId = "quynh"` (from role detection, but ignored)
- ✅ `paragraph.role = "narrator"` (used for mapping)
- ✅ Worker maps "narrator" → "Claribel Dervla" (valid Coqui speaker)
- ✅ Audio generation succeeds

---

## Testing / Kiểm Tra

### Test Scenario
1. Upload a novel with role detection (sets `voiceId` to VietTTS voices)
2. Generate audio with Coqui XTTS-v2 model
3. Verify:
   - ✅ No errors about missing `.pth` files
   - ✅ Voices are valid Coqui speakers
   - ✅ Audio generation succeeds

### Expected Logs
```
[Worker] Using enhanced mapped voice: Claribel Dervla (role: narrator, model: coqui-xtts-v2)
[Worker] ⚠️  Voice ID mismatch: "quynh" (from different model) → "Claribel Dervla" for coqui-xtts-v2
```

---

## Related Issues / Vấn Đề Liên Quan

### Issue 1: Role Detection Sets VoiceId
The role detection service still uses the old `getVoiceMapping()` which returns VietTTS voices. This is okay because:
- The worker now ignores `paragraph.voiceId` and uses `paragraph.role` instead
- Enhanced voice mapping handles the model-specific voice selection

### Issue 2: Coqui Backend Error Message
The error message `Voice file 'quynh.pth' not found` suggests Coqui TTS is trying to use "quynh" as a voice cloning reference. This happens when:
- An invalid speaker name is provided
- Coqui TTS falls back to voice cloning mode
- But the `.pth` file doesn't exist

**Solution:** Always provide valid built-in speaker names (like "Claribel Dervla") instead of model-specific voice IDs (like "quynh").

---

## Summary / Tóm Tắt

**Problem:** Worker used `paragraph.voiceId` directly, causing cross-model voice conflicts.

**Solution:** Always use enhanced voice mapping based on `paragraph.role`, ensuring voices are valid for the current model.

**Result:** ✅ Voices are correctly mapped for each TTS model, preventing errors.

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Fix Applied

