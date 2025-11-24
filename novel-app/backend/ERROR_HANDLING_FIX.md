# Error Handling Fix for Meaningless Paragraphs

## Problem / Vấn đề

When processing chapters, meaningless paragraphs (like separator lines with dashes) were causing errors that would:
1. Break the generation progression
2. Cause the system to skip to the next chapter instead of continuing with remaining paragraphs
3. Fail with `ValueError` instead of gracefully skipping

Example error:
```
ValueError: Text is too short or contains only punctuation (length: 38, meaningful: 0)
Text preview: '-------------------------------------....'
```

## Solution / Giải pháp

### 1. Backend Fix (TTS Backend)
- ✅ Updated `tts_backend/api.py` to detect meaningless paragraphs
- ✅ Returns JSON response with `skipped: true` instead of raising ValueError
- ✅ Detects separator lines (dashes, equals, underscores, etc.)
- ✅ Skips silently without errors

**Note:** Backend needs to be restarted for this fix to take effect.

### 2. TTS Service Fix
- ✅ Updated `ttsService.js` to check for `skipped` flag in responses
- ✅ Detects skipped paragraphs from backend responses
- ✅ Throws special `SkipError` that worker can handle gracefully
- ✅ Handles validation errors (400 status) for meaningless text as skip errors

### 3. Worker Service Fix
- ✅ Added client-side validation to detect meaningless paragraphs BEFORE calling TTS
- ✅ Improved error handling to detect all types of skip errors
- ✅ Continues processing remaining paragraphs even when errors occur
- ✅ Properly tracks skipped paragraphs in generation progress
- ✅ Errors are collected but don't stop chapter generation

### 4. Error Handling Flow

```
Paragraph Text
    ↓
Client-side validation (Worker)
    ↓ (meaningless detected)
    → Skip immediately, mark as skipped, continue to next paragraph
    ↓ (has meaning)
TTS API call
    ↓
Backend validation
    ↓ (meaningless detected)
    → Return skipped response, TTS service throws SkipError
    ↓ (has meaning)
Generate audio
    ↓
Success / Error
    ↓ (any error)
    → Log error, add to errors array, continue to next paragraph
```

## Files Modified / Tệp Đã Sửa

1. **`tts/dangvansam-VietTTS-backend/tts_backend/api.py`**
   - Added meaningless paragraph detection
   - Returns skipped response instead of error
   - Detects separator/decorator lines

2. **`novel-app/backend/src/services/ttsService.js`**
   - Checks for `skipped` flag in responses
   - Throws `SkipError` for skipped paragraphs
   - Handles validation errors as skip errors

3. **`novel-app/backend/src/services/worker.js`**
   - Added `isMeaninglessParagraph()` helper function
   - Client-side validation before TTS calls
   - Enhanced error detection for skip errors
   - Improved error handling to continue processing

## Behavior Changes / Thay Đổi Hành vi

### Before:
- ❌ Meaningless paragraphs caused ValueError
- ❌ Errors stopped chapter generation
- ❌ System would jump to next chapter
- ❌ No tracking of skipped paragraphs

### After:
- ✅ Meaningless paragraphs are detected and skipped
- ✅ Errors don't stop chapter generation
- ✅ System continues with remaining paragraphs in same chapter
- ✅ Skipped paragraphs are tracked in generation progress
- ✅ Both client-side and server-side validation

## Next Steps / Bước Tiếp theo

1. **Restart TTS Backend** to apply backend fix:
   ```powershell
   cd tts/dangvansam-VietTTS-backend
   .\stop_backend.ps1
   .\start_backend.ps1
   ```

2. **Restart Novel App Backend** to apply worker fixes:
   ```powershell
   cd novel-app/backend
   npm restart
   # or however you restart the backend
   ```

3. **Test with problematic chapters** - chapters with separator lines should now process all paragraphs correctly

## Meaningless Paragraph Detection / Phát Hiện Paragraph Vô nghĩa

A paragraph is considered meaningless if:
- Contains less than 5 meaningful (alphanumeric) characters
- Contains only separator characters: `-=_~*#@$%^&+|\\/<>{}[]()`
- Contains only punctuation: `.,:;!?`
- Is shorter than 10 characters with no meaningful content

Examples:
- `-------------------------------------` ✅ Skipped
- `=====` ✅ Skipped  
- `***` ✅ Skipped
- `Hello world` ❌ Processed
- `Chapter 1` ❌ Processed

