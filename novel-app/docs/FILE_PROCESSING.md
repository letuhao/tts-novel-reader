# Novel File Processing / Xử lý File Novel

## ✅ Backend Can Handle Files Now! / Backend Có thể Xử lý Files!

The backend now supports processing novel text files:
- ✅ Parse large text files
- ✅ Extract chapters, paragraphs, and lines
- ✅ Extract metadata (title, author)
- ✅ Store in database
- ✅ Query by ID or list all novels

Backend hiện hỗ trợ xử lý file text novel:
- ✅ Parse file text lớn
- ✅ Trích xuất chapters, paragraphs, và lines
- ✅ Trích xuất metadata (title, author)
- ✅ Lưu vào database
- ✅ Truy vấn theo ID hoặc liệt kê tất cả novels

## 📡 API Endpoints / Điểm cuối API

### Process Existing File / Xử lý File Có sẵn

```bash
POST /api/novels/process
Content-Type: application/json

{
  "filePath": "D:/Works/source/novel-reader/novel-app/novels/your-novel.txt"
}
```

**Response:**
```json
{
  "success": true,
  "novel": {
    "id": "uuid",
    "title": "Novel Title",
    "totalChapters": 54,
    "chapters": [...]
  },
  "message": "Novel processed successfully"
}
```

### Upload File / Upload File

```bash
POST /api/novels/upload
Content-Type: multipart/form-data

novel: <file>
```

### List All Novels / Liệt kê Tất cả Novels

```bash
GET /api/novels
```

### Get Novel by ID / Lấy Novel theo ID

```bash
GET /api/novels/:id
```

### Get Chapters / Lấy Chapters

```bash
GET /api/novels/:id/chapters
```

### Get Specific Chapter / Lấy Chapter Cụ thể

```bash
GET /api/novels/:id/chapters/:chapterNumber
```

## 🧪 Testing / Kiểm tra

Test script available:
```bash
cd backend
python test_upload.py
```

## 📊 Example / Ví dụ

Your novel file has been processed:
- **Title:** Bắt đầu biến thân nữ điều tra quan 1-54 chương
- **Chapters:** 54 chapters
- **Format:** Chapters, paragraphs, and lines extracted

---

**Backend is ready to handle novel files!**  
**Backend sẵn sàng xử lý file novel!**

