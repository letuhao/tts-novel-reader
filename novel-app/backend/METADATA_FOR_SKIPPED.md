# Metadata Generation for Skipped Paragraphs

## Problem / Vấn đề

Meaningless paragraphs (like separator lines) are skipped during audio generation, but no metadata file is created for them. This causes:
- No metadata tracking for skipped paragraphs
- Incomplete metadata structure in storage folders
- Missing information about why paragraphs were skipped

## Solution / Giải pháp

Generate metadata files for skipped paragraphs, even though no audio file is generated.

### Metadata Structure for Skipped Paragraphs

The metadata file includes:
- **Paragraph information**: novelId, chapterNumber, paragraphNumber, paragraphId, etc.
- **Text content**: Original paragraph text (for reference)
- **Status flags**: `skipped: true`, `status: 'skipped'`
- **Reason**: Why it was skipped (e.g., "Meaningless paragraph (separator/decorator line)")
- **Audio fields**: Set to null/0 (no audio file exists)
- **Generation parameters**: Speaker ID, model, etc. (for reference)

### Implementation Details

When a meaningless paragraph is detected:

1. **Ensure storage directory exists** (same structure as audio paragraphs)
2. **Create metadata object** with:
   - All paragraph identification fields
   - Text content and statistics
   - Status: `skipped`
   - Reason for skipping
   - Null/empty audio fields
3. **Save metadata file** to: `paragraph_{number}_metadata.json`
4. **Update progress tracking** in database

## Metadata File Structure

```json
{
  "fileId": null,
  "novelId": "...",
  "novelTitle": "...",
  "chapterNumber": 1,
  "chapterTitle": "...",
  "paragraphNumber": 154,
  "paragraphId": "...",
  "paragraphIndex": 153,
  "totalParagraphsInChapter": 162,
  "storageDir": "...",
  "ttsFileId": null,
  "audioURL": null,
  "localAudioPath": null,
  "subtitle": "【?? 】",
  "normalizedText": "【?? 】",
  "text": "【?? 】",
  "textStats": {
    "characterCount": 5,
    "wordCount": 1,
    "estimatedReadingTimeSeconds": 0
  },
  "audioDuration": 0,
  "audioDurationFormatted": "0:00",
  "audioFileSize": 0,
  "audioFileSizeMB": "0.00",
  "sampleRate": null,
  "generationParams": {
    "speakerId": "05",
    "model": "viettts",
    "speedFactor": 1.0
  },
  "status": "skipped",
  "reason": "Meaningless paragraph (separator/decorator line) - skipped by client-side validation",
  "skipped": true,
  "skippedAt": "2024-01-01T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Benefits / Lợi ích

✅ **Complete metadata structure**: Every paragraph has a metadata file
✅ **Tracking**: Can see which paragraphs were skipped and why
✅ **Consistency**: Same file structure for all paragraphs
✅ **Debugging**: Easier to understand why audio wasn't generated
✅ **Progress tracking**: Database and file system are in sync

## Files Changed / Tệp Đã Thay đổi

- `novel-app/backend/src/services/worker.js`
  - Added metadata generation for skipped meaningless paragraphs
  - Saves metadata file even when audio is not generated

## Storage Structure / Cấu trúc Lưu trữ

```
storage/audio/{novel_id}/chapter_001/
  ├── paragraph_001/
  │   ├── paragraph_001.wav
  │   └── paragraph_001_metadata.json  ✅ Audio generated
  ├── paragraph_154/
  │   └── paragraph_154_metadata.json  ✅ Metadata only (skipped)
  └── paragraph_162/
      ├── paragraph_162.wav
      └── paragraph_162_metadata.json  ✅ Audio generated
```

## Behavior Changes / Thay Đổi Hành vi

### Before:
- ❌ Skipped paragraphs had no metadata files
- ❌ Missing information about skipped paragraphs
- ❌ Incomplete metadata structure

### After:
- ✅ All paragraphs have metadata files (even skipped ones)
- ✅ Metadata includes reason for skipping
- ✅ Complete metadata structure for all paragraphs

