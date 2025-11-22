# Restart Servers Guide
# Hướng dẫn Khởi động lại Server

## Quick Restart / Khởi động lại Nhanh

### Option 1: Use Restart Script / Sử dụng Script Khởi động lại

```powershell
.\restart_servers.ps1
```

This will:
- ✅ Stop both servers
- ✅ Start TTS Backend (port 11111)
- ✅ Start Novel Backend (port 11110)
- ✅ Check if both are running

### Option 2: Restart Individually / Khởi động lại Từng Server

#### TTS Backend:
```powershell
cd app
python restart_backend.py
```

#### Novel Backend:
```powershell
cd novel-app/backend
python restart_backend.py
```

## Testing in Frontend / Kiểm tra trong Frontend

After servers are restarted:

1. **Start Frontend:**
   ```powershell
   cd novel-app/frontend
   npm run dev
   ```

2. **Open Browser:**
   - http://localhost:5173

3. **Test Audio Generation:**
   - Upload a novel or select existing novel
   - Navigate to a chapter (e.g., Chapter 1)
   - Click "Generate Audio for Chapter" button

4. **Verify Storage Organization:**
   - Files should be in: `novel-app/storage/audio/{novel_id}_{title}/chapter_XXX/paragraph_XXX/`
   - Audio files named: `paragraph_001.wav`, `paragraph_002.wav`, etc.
   - Each paragraph has its own `paragraph_XXX_metadata.json`

## Expected Structure After Fix / Cấu trúc Mong đợi Sau Khi Sửa

```
storage/audio/{novel_id}_{novel_title}/
  └── chapter_001_Chương_1/
      ├── paragraph_001/
      │   ├── paragraph_001.wav
      │   └── paragraph_001_metadata.json
      ├── paragraph_002/
      │   ├── paragraph_002.wav
      │   └── paragraph_002_metadata.json
      └── paragraph_003/
          ├── paragraph_003.wav
          └── paragraph_003_metadata.json
```

## What Was Fixed / Những gì Đã được Sửa

1. ✅ **ParagraphModel**: Now converts `snake_case` to `camelCase`
   - `paragraph_number` → `paragraphNumber`
   - Now `worker.js` can access `paragraph.paragraphNumber` correctly

2. ✅ **AudioStorage**: Now receives all metadata fields in `saveMetadata()`
   - `paragraphId`, `paragraphIndex`, `totalParagraphsInChapter`
   - `speakerId`, `model`, `speedFactor`

3. ✅ **Storage Organization**: Files now saved in paragraph subdirectories
   - Each paragraph gets its own folder
   - Proper naming: `paragraph_XXX.wav` and `paragraph_XXX_metadata.json`

## Server URLs / URL Server

- **TTS Backend**: http://127.0.0.1:11111
  - Health: http://127.0.0.1:11111/health
  - API Docs: http://127.0.0.1:11111/docs

- **Novel Backend**: http://127.0.0.1:11110
  - Health: http://127.0.0.1:11110/health
  - API: http://127.0.0.1:11110/api

- **Frontend**: http://localhost:5173
  - (After running `npm run dev`)

