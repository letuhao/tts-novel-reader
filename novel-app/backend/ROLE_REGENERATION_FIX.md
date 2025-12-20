# Role Regeneration Fix - Clear voiceId on Force Regenerate
# Sửa Lỗi Tái Tạo Vai Diễn - Xóa voiceId Khi Ép Tạo Lại

## Issue Found / Vấn Đề Tìm Thấy

### Problem / Vấn Đề
After force regenerating roles, paragraphs still had old `voiceId` values (e.g., "quynh" from VietTTS) even though new roles were detected. The popup showed different roles, but the voice assignments weren't updated.

**Root Cause:**
1. Role detection correctly detects new roles (e.g., "narrator", "male_1", "female_1")
2. But `roleDetectionWorker` was setting `voiceId` using the old voice mapping system
3. The old system returns VietTTS voices like "quynh" for all roles
4. So even with new roles, `voiceId` was still "quynh"
5. The worker was using `paragraph.voiceId` directly (before our fix), causing cross-model voice conflicts

---

## Fix Applied / Sửa Lỗi Đã Áp Dụng

### Solution / Giải Pháp
When force regenerating roles, **clear the `voiceId`** (set to `null`) so the worker uses enhanced voice mapping based on `paragraph.role`. This ensures:

1. ✅ Roles are correctly detected and saved
2. ✅ Old voiceId is cleared (no cross-model conflicts)
3. ✅ Worker uses enhanced voice mapping based on role
4. ✅ Correct voice is selected for the current TTS model

### Code Changes / Thay Đổi Mã

**File:** `novel-app/backend/src/services/roleDetectionWorker.js`

**Before:**
```javascript
if (role && voiceId) {
  await ParagraphModel.update(detectedParagraph.id, {
    role: role,
    voiceId: voiceId  // ❌ Always sets voiceId from old mapping
  });
}
```

**After:**
```javascript
if (role) {
  const updateData = {
    role: role,
    // Clear voiceId when force regenerating - let worker handle voice mapping
    voiceId: forceRegenerateRoles ? null : (voiceId || null)
  };
  
  await ParagraphModel.update(detectedParagraph.id, updateData);
  
  if (forceRegenerateRoles && voiceId) {
    console.log(`Cleared old voiceId "${voiceId}" for paragraph ${detectedParagraph.paragraphNumber}, role: ${role}`);
  }
}
```

---

## Expected Behavior After Fix / Hành Vi Mong Đợi Sau Khi Sửa

### Before Fix
1. Force regenerate roles → New roles detected (e.g., "narrator", "male_1")
2. But `voiceId` still set to "quynh" (from old mapping)
3. Worker uses "quynh" → Error with Coqui XTTS-v2

### After Fix
1. Force regenerate roles → New roles detected (e.g., "narrator", "male_1")
2. `voiceId` is cleared (set to `null`)
3. Worker uses `paragraph.role` with enhanced voice mapping
4. Correct voice selected for current model (e.g., "Claribel Dervla" for narrator with Coqui XTTS-v2)
5. ✅ Audio generation succeeds

---

## Related Fixes / Sửa Lỗi Liên Quan

### Fix 1: Worker Voice Selection (Previous)
- Worker now always uses enhanced voice mapping based on `paragraph.role`
- Ignores `paragraph.voiceId` if it exists (may be from different model)

### Fix 2: TTS Config Voice Mapping (Previous)
- Added validation for Coqui XTTS-v2 speakers
- Falls back to default speaker if invalid voice provided

### Fix 3: Role Regeneration (Current)
- Clears `voiceId` when force regenerating
- Ensures worker uses role-based voice mapping

---

## Testing / Kiểm Tra

### Test Scenario
1. Upload a novel with old role assignments (all "quynh")
2. Force regenerate roles
3. Verify:
   - ✅ New roles are detected (narrator, male_1, female_1, etc.)
   - ✅ `voiceId` is cleared (set to `null`)
   - ✅ Worker uses enhanced voice mapping
   - ✅ Correct voices are selected for current model
   - ✅ Audio generation succeeds

### Expected Logs
```
[RoleDetectionWorker] Force regenerate mode: Will overwrite roles for ALL X paragraphs
[RoleDetectionWorker] Cleared old voiceId "quynh" for paragraph 1, role: narrator
[RoleDetectionWorker] Cleared old voiceId "quynh" for paragraph 2, role: male_1
[Worker] Using enhanced mapped voice: Claribel Dervla (role: narrator, model: coqui-xtts-v2)
[Worker] Using enhanced mapped voice: Andrew Chipper (role: male_1, model: coqui-xtts-v2)
```

---

## Summary / Tóm Tắt

**Problem:** Force regenerating roles didn't clear old `voiceId`, causing cross-model voice conflicts.

**Solution:** Clear `voiceId` when force regenerating, let worker use enhanced voice mapping based on role.

**Result:** ✅ Roles are correctly detected, voices are correctly mapped for each TTS model.

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Fix Applied

