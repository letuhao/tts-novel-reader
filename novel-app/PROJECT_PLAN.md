# Novel Reader App - Project Plan / Kế hoạch Dự án

## 🎯 Features / Tính năng

### Core Features / Tính năng Cốt lõi ✅

1. ✅ **Novel Parsing** - Parse large text files to chapters/paragraphs/lines
2. ✅ **TTS Integration** - Generate audio via TTS backend (365 days expiration)
3. ✅ **Audio Playback** - Play novel with controls
4. ✅ **User Progression** - Save and resume reading position

### Suggested Enhancements / Cải tiến Đề xuất 💡

1. **Chapter Queue System** - Queue chapters for continuous playback
2. **Preloading** - Preload next chapter while playing current
3. **Playback Speed Control** - Adjustable speed (0.5x - 2x)
4. **Text Sync** - Show text with audio sync highlighting
5. **Bookmark System** - Bookmark favorite positions
6. **Reading Statistics** - Track reading time, progress
7. **Dark Mode** - Theme support
8. **Multi-novel Library** - Support multiple novels
9. **Search Function** - Search within novel
10. **Chapter Navigation** - Jump to specific chapter
11. **Background Generation** - Pre-generate audio in background
12. **Progress Sync** - Sync across devices (future)

## 📁 Project Structure / Cấu trúc Dự án

```
novel-app/
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   │   ├── novels.js    # Novel management
│   │   │   ├── audio.js     # Audio generation/playback
│   │   │   └── progress.js  # User progression
│   │   ├── services/
│   │   │   ├── novelParser.js    # Parse novels
│   │   │   ├── ttsService.js     # TTS backend integration
│   │   │   ├── audioStorage.js   # Audio storage management
│   │   │   └── progressService.js # Progress tracking
│   │   ├── models/
│   │   │   ├── Novel.js     # Novel model
│   │   │   ├── Chapter.js   # Chapter model
│   │   │   └── Progress.js  # Progress model
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── errors.js
│   │   └── server.js        # Express server
│   ├── config/
│   │   └── config.js        # Configuration
│   ├── storage/             # File storage
│   │   ├── novels/          # Novel text files
│   │   └── audio/           # Generated audio (temp)
│   ├── database/            # SQLite database
│   │   └── novels.db
│   ├── package.json
│   └── .env
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── NovelReader.jsx
│   │   │   ├── AudioPlayer.jsx
│   │   │   ├── ChapterList.jsx
│   │   │   └── ProgressBar.jsx
│   │   ├── pages/
│   │   │   ├── Library.jsx
│   │   │   ├── Reader.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js       # Backend API client
│   │   ├── hooks/
│   │   │   ├── useAudio.js
│   │   │   └── useProgress.js
│   │   ├── store/           # State management
│   │   │   └── store.js
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── shared/                  # Shared types/config
    └── types.js
```

## 🔧 Technical Stack / Tech Stack

### Backend / Backend

- **Runtime:** Node.js 18+ (LTS)
- **Framework:** Express.js (simple, well-known)
- **Database:** SQLite (simple, file-based, no setup needed)
- **ORM:** Better-SQLite3 or Sequelize
- **File Storage:** Local filesystem
- **TTS Integration:** Axios HTTP client

### Frontend / Frontend

- **Framework:** React + Vite (fast, modern)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Zustand (simple, lightweight)
- **Audio:** Howler.js or native HTML5 Audio API
- **Build:** Vite

## 📊 Data Models / Mô hình Dữ liệu

### Novel Model / Mô hình Novel

```javascript
{
  id: string,
  title: string,
  filePath: string,
  chapters: Chapter[],
  metadata: {
    author: string,
    totalChapters: number,
    createdAt: Date,
    updatedAt: Date
  }
}
```

### Chapter Model / Mô hình Chapter

```javascript
{
  id: string,
  novelId: string,
  chapterNumber: number,
  title: string,
  paragraphs: Paragraph[],
  audioFileId: string | null,  // TTS backend file ID
  audioGenerated: boolean,
  audioExpiresAt: Date | null
}
```

### Paragraph Model / Mô hình Paragraph

```javascript
{
  id: string,
  chapterId: string,
  paragraphNumber: number,
  lines: string[],
  audioChunkFileId: string | null  // Optional: chunk audio for better performance
}
```

### Progress Model / Mô hình Progress

```javascript
{
  id: string,
  novelId: string,
  chapterId: string,
  paragraphId: string,
  position: number,  // Current audio position in seconds
  completed: boolean,
  lastReadAt: Date,
  readingTimeSeconds: number
}
```

## 🚀 API Endpoints / Điểm cuối API

### Novel Management / Quản lý Novel

- `GET /api/novels` - List all novels
- `POST /api/novels/upload` - Upload novel file
- `GET /api/novels/:id` - Get novel details
- `GET /api/novels/:id/chapters` - Get all chapters
- `GET /api/novels/:id/chapters/:chapterId` - Get chapter details

### Audio Generation / Tạo Audio

- `POST /api/audio/generate` - Generate audio for chapter/paragraph
- `GET /api/audio/:fileId` - Get audio file URL
- `GET /api/audio/status/:requestId` - Check generation status

### Progress Tracking / Theo dõi Tiến độ

- `GET /api/progress/:novelId` - Get reading progress
- `POST /api/progress` - Save reading progress
- `PUT /api/progress/:id` - Update progress
- `GET /api/progress/stats/:novelId` - Get reading statistics

## 💡 Implementation Strategy / Chiến lược Triển khai

### Phase 1: Backend Setup / Giai đoạn 1: Thiết lập Backend

1. Initialize Node.js project
2. Set up Express server
3. Create novel parser service
4. Set up SQLite database
5. Create API routes

### Phase 2: TTS Integration / Giai đoạn 2: Tích hợp TTS

1. Create TTS service client
2. Integrate with TTS backend API
3. Handle audio storage
4. Implement expiration management

### Phase 3: Frontend Setup / Giai đoạn 3: Thiết lập Frontend

1. Initialize React + Vite
2. Create novel reader UI
3. Build audio player component
4. Implement progress tracking

### Phase 4: Integration / Giai đoạn 4: Tích hợp

1. Connect frontend to backend
2. Real-time audio playback
3. Progress synchronization
4. Testing

---

**Ready to start building!**  
**Sẵn sàng bắt đầu xây dựng!**

