# Storage Structure Fixed - Better Organization
# Cấu Trúc Lưu Trữ Đã Sửa - Tổ Chức Tốt Hơn

## 🔍 Problem Identified / Vấn Đề Đã Xác Định

### Current Structure (Messy) / Cấu Trúc Hiện Tại (Lộn Xộn):

```
novel-app/storage/audio/
└── {novel_id}/                          ← Only ID, no title
    └── chapter_001/                     ← Only number, no title
        └── paragraph_000/
            ├── {file_id}.wav            ← Long random file ID
            └── {file_id}.json           ← Long random file ID
```

**Problems / Vấn Đề:**
- ❌ No chapter titles in folder names
- ❌ No novel titles in folder names
- ❌ Long file IDs make it hard to identify files
- ❌ Hard to navigate by novel/chapter names

- ❌ Không có tiêu đề chapter trong tên thư mục
- ❌ Không có tiêu đề novel trong tên thư mục
- ❌ File ID dài khó nhận biết file
- ❌ Khó điều hướng theo tên novel/chapter

## ✅ New Structure (Organized) / Cấu Trúc Mới (Có Tổ Chức)

### Structure / Cấu Trúc:

```
novel-app/storage/audio/
└── {novel_id}_{sanitized_novel_title}/  ← Novel ID + Title
    └── chapter_001_{sanitized_chapter_title}/  ← Chapter Number + Title
        └── paragraph_000/
            ├── paragraph_000.wav        ← Simple, readable name
            └── paragraph_000_metadata.json  ← Simple, readable name
```

### Example / Ví dụ:

```
novel-app/storage/audio/
└── 522e13ed-db50-4d2a-a0d9-92a3956d527d_Bat_dau_bien_than_nu_dieu_tra_quan/
    └── chapter_001_Chuong_1/
        ├── paragraph_000/
        │   ├── paragraph_000.wav
        │   └── paragraph_000_metadata.json
        ├── paragraph_001/
        │   ├── paragraph_001.wav
        │   └── paragraph_001_metadata.json
        └── ...
```

## 📝 Changes Made / Các Thay Đổi Đã Thực Hiện

### 1. Added `sanitizeFileName()` Method / Thêm Phương Thức `sanitizeFileName()`

**File:** `novel-app/backend/src/services/audioStorage.js`

**Purpose / Mục Đích:**
- Sanitize chapter/novel titles for use in file/folder names
- Remove invalid characters
- Replace spaces with underscores
- Limit length to 100 characters

- Làm sạch tiêu đề chapter/novel để dùng trong tên file/thư mục
- Loại bỏ ký tự không hợp lệ
- Thay thế khoảng trắng bằng dấu gạch dưới
- Giới hạn độ dài 100 ký tự

### 2. Updated `getStoragePath()` Method / Cập Nhật Phương Thức `getStoragePath()`

**Changes / Thay Đổi:**
- Now accepts `chapterTitle` and `novelTitle` parameters
- Creates organized folder structure: `{novel_id}_{title}/chapter_{number}_{title}/`
- Sanitizes titles for safe file system use

- Giờ nhận tham số `chapterTitle` và `novelTitle`
- Tạo cấu trúc thư mục có tổ chức: `{novel_id}_{title}/chapter_{number}_{title}/`
- Làm sạch tiêu đề để dùng an toàn trong hệ thống file

### 3. Updated `getAudioFilePath()` Method / Cập Nhật Phương Thức `getAudioFilePath()`

**Changes / Thay Đổi:**
- Uses simpler filename: `paragraph_{number}.wav` instead of `{file_id}.wav`
- Easier to identify and navigate

- Sử dụng tên file đơn giản hơn: `paragraph_{number}.wav` thay vì `{file_id}.wav`
- Dễ nhận biết và điều hướng hơn

### 4. Updated `getMetadataFilePath()` Method / Cập Nhật Phương Thức `getMetadataFilePath()`

**Changes / Thay Đổi:**
- Uses simpler filename: `paragraph_{number}_metadata.json` instead of `{file_id}.json`
- Easier to identify and navigate

- Sử dụng tên file đơn giản hơn: `paragraph_{number}_metadata.json` thay vì `{file_id}.json`
- Dễ nhận biết và điều hướng hơn

### 5. Updated Worker to Pass Titles / Cập Nhật Worker để Truyền Tiêu Đề

**File:** `novel-app/backend/src/services/worker.js`

**Changes / Thay Đổi:**
- Worker now extracts `novel.title` and `chapter.title`
- Passes them to `generateAndStore()` for better organization

- Worker giờ trích xuất `novel.title` và `chapter.title`
- Truyền chúng vào `generateAndStore()` để tổ chức tốt hơn

## 📊 Storage Structure / Cấu Trúc Lưu Trữ

### Organized Path Structure / Cấu Trúc Đường Dẫn Có Tổ Chức:

```
storage/audio/
├── {novel_id}_{novel_title}/
│   ├── chapter_001_{chapter_title}/
│   │   ├── paragraph_000/
│   │   │   ├── paragraph_000.wav
│   │   │   └── paragraph_000_metadata.json
│   │   ├── paragraph_001/
│   │   │   ├── paragraph_001.wav
│   │   │   └── paragraph_001_metadata.json
│   │   └── ...
│   ├── chapter_002_{chapter_title}/
│   │   └── ...
│   └── ...
```

### Benefits / Lợi Ích:

✅ **Easy navigation** - Can see novel/chapter names in folder structure
✅ **Clear organization** - Each novel/chapter/paragraph is clearly organized
✅ **Simple filenames** - `paragraph_000.wav` instead of random file IDs
✅ **Readable structure** - Easy to find files by novel/chapter/paragraph

✅ **Dễ điều hướng** - Có thể thấy tên novel/chapter trong cấu trúc thư mục
✅ **Tổ chức rõ ràng** - Mỗi novel/chapter/paragraph được tổ chức rõ ràng
✅ **Tên file đơn giản** - `paragraph_000.wav` thay vì file ID ngẫu nhiên
✅ **Cấu trúc dễ đọc** - Dễ tìm file theo novel/chapter/paragraph

## 🔄 Migration / Di Chuyển

### Old Files / File Cũ:

Files generated before this change will still use the old structure:
- `{novel_id}/chapter_XXX/paragraph_YYY/{file_id}.wav`

### New Files / File Mới:

Files generated after this change will use the new structure:
- `{novel_id}_{title}/chapter_XXX_{title}/paragraph_YYY/paragraph_YYY.wav`

### Recommendation / Khuyến Nghị:

- Old files can coexist with new files
- Consider migrating old files when regenerating
- New structure is backward compatible (fallback to ID-only if title not available)

- File cũ có thể tồn tại cùng file mới
- Nên di chuyển file cũ khi tạo lại
- Cấu trúc mới tương thích ngược (fallback sang chỉ ID nếu không có title)

---

**Status: ✅ FIXED - Better Organization Implemented**  
**Trạng thái: ✅ ĐÃ SỬA - Tổ Chức Tốt Hơn Đã Triển Khai**

