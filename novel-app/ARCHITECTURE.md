# Novel Reader App Architecture / Kiến trúc Ứng dụng Đọc Truyện

## 🎯 Project Structure / Cấu trúc Dự án

```
novel-app/
├── backend/              # Node.js Backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── models/      # Data models
│   │   ├── utils/       # Utilities
│   │   └── middleware/  # Express middleware
│   ├── config/          # Configuration
│   ├── storage/         # File storage (novels, audio)
│   └── package.json
├── frontend/            # Frontend (React/Next.js)
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Pages/routes
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API services
│   │   └── store/       # State management
│   └── package.json
├── shared/              # Shared types/configs
│   └── types/          # TypeScript types
└── novels/             # Novel text files
```

## 🚀 Features / Tính năng

### Core Features / Tính năng Cốt lõi

1. ✅ **Novel Parsing** - Parse large text files to chapters/paragraphs/lines
2. ✅ **TTS Integration** - Generate audio via TTS backend
3. ✅ **Audio Storage** - Temporary storage with expiration
4. ✅ **Playback** - Play novel with controls
5. ✅ **User Progression** - Save and resume reading

### Suggested Enhancements / Cải tiến Đề xuất

1. **Chunking Strategy** - Break large chapters into smaller audio chunks
2. **Preloading** - Preload next chapter while playing current
3. **Playback Speed** - Adjustable playback speed (0.5x - 2x)
4. **Bookmarking** - Allow users to bookmark specific positions
5. **Playlist** - Queue chapters for continuous playback
6. **Dark Mode** - Theme support
7. **Text Display** - Show text while playing (sync highlight)
8. **Offline Support** - Cache for offline playback
9. **Statistics** - Reading time, progress, etc.
10. **Multi-novel** - Support multiple novels in library

## 📋 Technical Stack Suggestions / Đề xuất Tech Stack

### Backend / Backend

- **Runtime:** Node.js 18+ (LTS)
- **Framework:** Express.js or Fastify (Fastify recommended for better performance)
- **Database:** SQLite (local) or PostgreSQL (for multi-user)
- **ORM:** Prisma or Drizzle ORM
- **File Storage:** Local filesystem + metadata in database
- **Task Queue:** Bull/BullMQ (for background generation)

### Frontend / Frontend

- **Framework:** Next.js 14+ (App Router) or React + Vite
- **UI:** Tailwind CSS + shadcn/ui or Material-UI
- **State:** Zustand or Redux Toolkit
- **Audio:** Howler.js or native HTML5 Audio API
- **Text Display:** React component with scroll sync

## 🔧 Implementation Plan / Kế hoạch Triển khai

### Phase 1: Backend Setup / Giai đoạn 1: Thiết lập Backend
1. Initialize Node.js project
2. Set up Express/Fastify server
3. Create novel parsing service
4. Integrate TTS backend API
5. Create audio storage service
6. User progression database

### Phase 2: Frontend Setup / Giai đoạn 2: Thiết lập Frontend
1. Initialize React/Next.js
2. Create novel reader UI
3. Audio player component
4. Progress tracking UI
5. Novel library view

### Phase 3: Integration / Giai đoạn 3: Tích hợp
1. Connect frontend to backend
2. Real-time playback
3. Progress synchronization
4. Audio preloading

---

**Let's start building!**  
**Bắt đầu xây dựng!**

