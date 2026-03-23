# Frontend Voice Display Fix
# Sửa Lỗi Hiển Thị Giọng Frontend

## Issue Found / Vấn Đề Tìm Thấy

### Problem / Vấn Đề
After force regenerating roles, the frontend still displayed "quynh" for all paragraphs, even though:
- Backend correctly detected new roles (narrator, male_1, female_1, etc.)
- Backend correctly cleared `voiceId` (set to `null`)
- Backend correctly uses enhanced voice mapping in worker

**Root Cause:**
The frontend was displaying `paragraph.voiceId` directly, which was `null` after force regeneration. The frontend didn't resolve voices based on `paragraph.role` using the enhanced voice mapping system.

---

## Fix Applied / Sửa Lỗi Đã Áp Dụng

### Solution / Giải Pháp
1. Created `useVoiceResolver` hook to resolve voices for roles using the backend API
2. Updated `RoleIndicator` component to use the hook and display resolved voices
3. Updated `ChapterContent` to pass `novelId` and `model` to `RoleIndicator`
4. Updated `ReaderPage` to pass `novelId` and `model` to `ChapterContent`
5. Enhanced role display to support `male_1`, `female_1`, etc.

### Files Changed / Thay Đổi Mã

#### 1. New Hook: `hooks/useVoiceResolver.ts`
- Resolves voice for a role using `/api/voice-mapping/resolve` endpoint
- Includes simple caching (5 minute TTL)
- Handles loading and error states

#### 2. Updated: `components/Reader/RoleIndicator.tsx`
- Uses `useVoiceResolver` hook to get resolved voice
- Displays resolved voice instead of raw `voiceId`
- Supports enhanced roles (`male_1`, `female_1`, etc.)
- Shows loading state while resolving

#### 3. Updated: `components/Reader/ChapterContent.tsx`
- Accepts `novelId` and `model` props
- Passes props to `RoleIndicator`

#### 4. Updated: `pages/ReaderPage.tsx`
- Passes `novelId` and `model` to `ChapterContent`
- Gets model from environment variable or defaults to `coqui-xtts-v2`

---

## Expected Behavior After Fix / Hành Vi Mong Đợi Sau Khi Sửa

### Before Fix
- ❌ Frontend shows "quynh" for all paragraphs (from old `voiceId`)
- ❌ After force regenerate, shows nothing (because `voiceId` is `null`)

### After Fix
- ✅ Frontend resolves voice based on `paragraph.role`
- ✅ Shows correct voice for current model (e.g., "Claribel Dervla" for narrator with Coqui XTTS-v2)
- ✅ Shows loading state while resolving
- ✅ Supports enhanced roles (`male_1`, `female_1`, etc.)

---

## Testing / Kiểm Tra

### Test Scenario
1. Force regenerate roles for a novel
2. Check frontend - should show:
   - ✅ Correct roles (narrator, male_1, female_1, etc.)
   - ✅ Correct voices for current model (not "quynh")
   - ✅ Loading state while resolving voices

### Expected Display
- **Role:** Narrator → **Voice:** Claribel Dervla (for Coqui XTTS-v2)
- **Role:** Male 1 → **Voice:** Andrew Chipper (for Coqui XTTS-v2)
- **Role:** Female 1 → **Voice:** Daisy Studious (for Coqui XTTS-v2)

---

## Summary / Tóm Tắt

**Problem:** Frontend displayed old `voiceId` values instead of resolving voices based on roles.

**Solution:** Created `useVoiceResolver` hook and updated components to resolve and display voices based on roles using enhanced voice mapping.

**Result:** ✅ Frontend correctly displays voices based on roles and current TTS model.

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Fix Applied

