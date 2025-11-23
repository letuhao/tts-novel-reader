# Add Novel Pipeline Review
# Đánh giá Pipeline Thêm Novel

## Current Flow / Luồng Hiện tại

### 1. Upload/Process Novel / Upload/Process Novel

**Frontend:**
- Component: `novel-app/frontend/src/components/Library/NovelUpload.tsx`
- Service: `novel-app/frontend/src/services/novels.ts`
- API Call: `POST /api/novels/upload` or `POST /api/novels/process`

**Backend Routes:**
- File: `novel-app/backend/src/routes/novels.js`
- **Route 1:** `POST /api/novels/upload`
  - Uses `multer` to upload file
  - Saves to `storage/novels/`
  - Calls `NovelParser.parseNovel(filePath)`

- **Route 2:** `POST /api/novels/process`
  - Processes existing file by path
  - Validates file exists
  - Calls `NovelParser.parseNovel(filePath)`

---

### 2. Novel Parsing / Parse Novel

**Service:** `novel-app/backend/src/services/novelParser.js`

**Main Function:** `NovelParser.parseNovel(filePath)`

**Steps:**
```javascript
1. Read file content (UTF-8)
   ↓
2. Extract metadata (title, author, etc.)
   ↓
3. Parse chapters → parseChapters(content)
   ↓
4. Return structured data:
   {
     id: uuid,
     title: "...",
     filePath: "...",
     metadata: {...},
     chapters: [
       {
         id: uuid,
         chapterNumber: 1,
         title: "Chương 1",
         paragraphs: [
           {
             id: uuid,
             paragraphNumber: 1,
             lines: ["line1", "line2"],
             text: "line1\nline2"
           },
           ...
         ],
         totalParagraphs: 10,
         totalLines: 50
       },
       ...
     ]
   }
```

**Chapter Parsing (`parseChapters()`):**
- Detects chapter markers:
  - `Chương 1`, `Chương 2:`, etc.
  - `Thứ 0001 chương`
  - `Chapter 1`
- Splits content into chapters

**Paragraph Parsing:**
- Empty line = paragraph break
- Each paragraph contains:
  - `id`: UUID
  - `paragraphNumber`: 1-based index (resets per chapter)
  - `lines`: Array of lines
  - `text`: Joined lines with `\n`

---

### 3. Database Storage / Lưu trữ Database

**Model:** `novel-app/backend/src/models/Novel.js`

**Function:** `NovelModel.create(novelData)`

**Tables:**

#### `novels` table:
```sql
- id (TEXT PRIMARY KEY)
- title (TEXT)
- file_path (TEXT)
- metadata (TEXT - JSON)
- total_chapters (INTEGER)
- total_paragraphs (INTEGER)
- created_at (TEXT)
- updated_at (TEXT)
```

#### `chapters` table:
```sql
- id (TEXT PRIMARY KEY)
- novel_id (TEXT - FK)
- chapter_number (INTEGER)
- title (TEXT)
- content (TEXT)
- total_paragraphs (INTEGER)
- total_lines (INTEGER)
- created_at (TEXT)
- updated_at (TEXT)
UNIQUE(novel_id, chapter_number)
```

#### `paragraphs` table:
```sql
- id (TEXT PRIMARY KEY)
- novel_id (TEXT - FK)
- chapter_id (TEXT - FK)
- chapter_number (INTEGER)
- paragraph_number (INTEGER)
- text (TEXT NOT NULL)
- lines (TEXT - JSON array)
- created_at (TEXT)
- updated_at (TEXT)
UNIQUE(novel_id, chapter_id, paragraph_number)
```

**Storage Flow:**
```javascript
1. Insert novel → novels table
   ↓
2. For each chapter:
   - Insert chapter → chapters table
   - For each paragraph:
     - Insert paragraph → paragraphs table
   ↓
3. Update novel totals
```

---

## Current Data Structure / Cấu trúc Dữ liệu Hiện tại

### Paragraph Object:
```javascript
{
  id: "uuid-1234",
  paragraphNumber: 1,
  lines: ["Đây là dòng 1", "Đây là dòng 2"],
  text: "Đây là dòng 1\nĐây là dòng 2"
}
```

### Chapter Object:
```javascript
{
  id: "uuid-5678",
  chapterNumber: 1,
  title: "Chương 1",
  paragraphs: [...],  // Array of paragraph objects
  totalParagraphs: 10,
  totalLines: 50
}
```

---

## Integration Points for Role Detection / Điểm Tích hợp cho Role Detection

### Option 1: During Parsing (Before DB Save) / Trong lúc Parse (Trước khi Lưu DB)

**Location:** `novel-app/backend/src/services/novelParser.js`

**Modification:**
- After `parseChapters()` or within `parseChapters()`
- Add role detection for each paragraph
- Add `role` field to paragraph object

**Pros:**
- Role detected immediately
- Stored in DB from start
- No separate step needed

**Cons:**
- Slower parsing (needs to call role detection service)
- Blocks upload until role detection completes

**Implementation:**
```javascript
// In parseChapters() or parseNovel()
for (const chapter of chapters) {
  for (const paragraph of chapter.paragraphs) {
    // Call role detection service
    paragraph.role = await RoleDetectionService.detectRole(
      paragraph.text,
      chapterContext  // Optional: full chapter text for context
    );
  }
}
```

---

### Option 2: After Parsing (Separate Step) / Sau khi Parse (Bước Riêng)

**Location:** New endpoint or batch job

**Flow:**
1. Upload/Parse novel → Save to DB (current flow)
2. Separate step: Detect roles for all paragraphs
3. Update paragraphs table with roles

**Pros:**
- Fast upload (no blocking)
- Can re-run role detection later
- Can use chapter context for better accuracy

**Cons:**
- Requires additional step
- Roles not available immediately

**Implementation:**
```javascript
// New endpoint: POST /api/novels/:id/detect-roles
router.post('/:id/detect-roles', async (req, res) => {
  const novel = await NovelModel.getById(req.params.id);
  
  for (const chapter of novel.chapters) {
    // Get all paragraphs for context
    const paragraphs = chapter.paragraphs;
    const chapterText = paragraphs.map(p => p.text).join('\n\n');
    
    // Detect roles for each paragraph
    for (const paragraph of paragraphs) {
      const role = await RoleDetectionService.detectRole(
        paragraph.text,
        chapterText  // Full chapter context
      );
      
      // Update paragraph in DB
      await ParagraphModel.updateRole(paragraph.id, role);
    }
  }
});
```

---

### Option 3: On-Demand (During TTS Generation) / Theo yêu cầu (Trong lúc TTS Generation)

**Location:** `novel-app/backend/src/services/worker.js` or `audioStorage.js`

**Flow:**
- When generating audio for a paragraph
- Check if role exists in DB
- If not, detect role on-the-fly
- Use role to select voice preset

**Pros:**
- Lazy loading (only when needed)
- No initial processing time

**Cons:**
- Slower TTS generation (role detection per paragraph)
- Roles not pre-computed

**Implementation:**
```javascript
// In generateChapterAudio() or generateAndStore()
async function generateAudioForParagraph(paragraph) {
  // Check if role exists
  let role = paragraph.role;
  
  if (!role) {
    // Detect role on-demand
    const chapterContext = await getChapterContext(paragraph.chapterId);
    role = await RoleDetectionService.detectRole(
      paragraph.text,
      chapterContext
    );
    
    // Save role for future use
    await ParagraphModel.updateRole(paragraph.id, role);
  }
  
  // Select voice based on role
  const voicePreset = VoicePresetService.getPresetForRole(role);
  
  // Generate TTS with voice preset
  await generateTTS(paragraph.text, voicePreset);
}
```

---

## Recommended Approach / Phương pháp Đề xuất

### **Hybrid Approach (Option 2 + 3):**

1. **After Parsing:** Batch role detection for all paragraphs
   - **Sau khi Parse:** Batch role detection cho tất cả paragraphs
   - Fast upload, roles detected in background
   - Upload nhanh, roles được detect trong background

2. **On-Demand Fallback:** If role not found, detect on-the-fly
   - **Fallback theo yêu cầu:** Nếu không tìm thấy role, detect ngay
   - Ensures TTS always has voice selection
   - Đảm bảo TTS luôn có voice selection

**Implementation Steps:**
1. Add `role` column to `paragraphs` table
2. Create role detection service endpoint
3. Create batch role detection endpoint (`POST /api/novels/:id/detect-roles`)
4. Modify TTS generation to use role for voice selection
5. Add on-demand role detection fallback

---

## Database Schema Changes / Thay đổi Schema Database

### Add `role` column to `paragraphs` table:

```sql
ALTER TABLE paragraphs ADD COLUMN role TEXT;
-- Possible values: 'male', 'female', 'narrator', NULL
```

### Add index for faster queries:

```sql
CREATE INDEX IF NOT EXISTS idx_paragraphs_role 
ON paragraphs(novel_id, chapter_number, role);
```

---

## API Endpoints Needed / API Endpoints Cần thiết

### 1. Role Detection Service Endpoint

**POST `/api/role-detection/detect`**
```json
Request:
{
  "paragraphs": [
    "Đây là đoạn văn 1...",
    "Đây là đoạn văn 2...",
    ...
  ],
  "context": "Full chapter text...",  // Optional
  "method": "phobert"  // or "hybrid"
}

Response:
{
  "role_map": {
    "0": "narrator",
    "1": "male",
    "2": "female",
    ...
  }
}
```

### 2. Batch Role Detection for Novel

**POST `/api/novels/:id/detect-roles`**
```json
Request:
{
  "chapterNumbers": [1, 2, 3],  // Optional: specific chapters
  "force": false  // Force re-detection even if roles exist
}

Response:
{
  "success": true,
  "novelId": "...",
  "chaptersProcessed": 3,
  "paragraphsProcessed": 150,
  "roles": {
    "narrator": 80,
    "male": 40,
    "female": 30
  }
}
```

---

## Next Steps / Bước Tiếp theo

1. ✅ Review complete - Pipeline understood
2. ⏭️ Wait for user command on model selection
3. ⏭️ Setup role detection service
4. ⏭️ Add `role` column to database
5. ⏭️ Integrate with parsing pipeline
6. ⏭️ Create voice preset system
7. ⏭️ Integrate with TTS generation

