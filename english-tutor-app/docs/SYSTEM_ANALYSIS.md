# Phân Tích Hệ Thống English Tutor App

**Ngày phân tích:** 2025-01-XX  
**Trạng thái hệ thống:** ✅ 90% Hoàn thành

---

## 📋 Tổng Quan

English Tutor App là một nền tảng học tiếng Anh được hỗ trợ bởi AI, sử dụng:
- **Ollama** - Engine AI chính (gemma3:12b)
- **Coqui TTS** - Tổng hợp giọng nói (Text-to-Speech)
- **Whisper STT** - Nhận dạng giọng nói (Speech-to-Text)
- **PostgreSQL** - Cơ sở dữ liệu chính
- **WebSocket** - Giao tiếp real-time

---

## 🏗️ Kiến Trúc Hệ Thống

### 1. Backend (Node.js + TypeScript + Express)

#### **Cấu trúc thư mục:**
```
backend/
├── src/
│   ├── database/          # Kết nối DB và migrations
│   ├── middleware/        # Auth, logging middleware
│   ├── repositories/      # Data access layer
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   │   ├── auth/         # Xác thực người dùng
│   │   ├── conversation/ # Quản lý hội thoại
│   │   ├── memory/       # Quản lý bộ nhớ (LangChain)
│   │   ├── ollama/       # Tích hợp Ollama AI
│   │   ├── tts/          # Text-to-Speech service
│   │   ├── stt/          # Speech-to-Text service
│   │   ├── websocket/    # WebSocket server
│   │   └── settings/     # System & user settings
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities (logger, etc.)
```

#### **Các thành phần chính:**

##### **1.1. Pipeline Service** (`pipelineService.ts`)
- **Chức năng:** Xử lý response từ Ollama và tạo TTS
- **Flow:**
  1. Parse response từ Ollama (structured JSON hoặc fallback)
  2. Chia response thành chunks (có emotion, icon, pause)
  3. Lưu message và chunks vào database
  4. Xử lý TTS cho từng chunk (sequential, maxConcurrent=1)
  5. Emit events qua EventBus → WebSocket → Frontend

- **Đặc điểm:**
  - Sequential TTS processing (tối ưu cho single GPU)
  - Event-driven architecture
  - Real-time updates qua WebSocket
  - Timeout handling (30s per chunk)

##### **1.2. Conversation Service** (`conversationService.ts`)
- **Chức năng:** Quản lý conversations, messages, chunks
- **Methods chính:**
  - `createConversation()` - Tạo conversation mới
  - `sendMessage()` - Gửi message của user
  - `saveAssistantResponse()` - Lưu response từ AI
  - `updateChunk()` - Cập nhật chunk với audio file ID
  - `getConversationHistory()` - Lấy lịch sử hội thoại

##### **1.3. Event Bus** (`eventBus.ts`)
- **Chức năng:** Event-driven communication
- **Event types:**
  - `conversation:started`, `conversation:updated`, `conversation:ended`
  - `message:sent`, `message:received`
  - `chunk:created`, `chunk:tts-started`, `chunk:tts-completed`, `chunk:tts-failed`
  - `audio:ready`, `audio:played`
  - `memory:updated`, `error:occurred`

- **Luồng hoạt động:**
  1. Service emit event → EventBus
  2. EventBus broadcast qua WebSocket
  3. Frontend nhận event và update UI

##### **1.4. WebSocket Service** (`websocketService.ts`)
- **Chức năng:** Real-time communication với frontend
- **Features:**
  - Connection management per conversation
  - Broadcast events to conversation subscribers
  - Ping/pong keepalive
  - Connection tracking (connectionId, conversationId, userId)

##### **1.5. Memory Service** (`memoryService.ts`)
- **Chức năng:** Quản lý conversation context
- **Strategy:** LangChain adapter với summarization
- **Features:**
  - Lưu trữ conversation history
  - Tạo summaries cho long conversations
  - Provide context cho Ollama API calls

##### **1.6. Ollama Service** (`ollamaService.ts`)
- **Chức năng:** Tích hợp với Ollama API
- **Methods:**
  - `chat()` - Basic chat
  - `tutorConversation()` - Chat với structured JSON response
  - `analyzeGrammar()` - Phân tích ngữ pháp
  - `generateExercise()` - Tạo bài tập
  - `provideFeedback()` - Đưa ra feedback

##### **1.7. Repositories** (Data Access Layer)
- `conversationRepository.ts` - CRUD conversations
- `messageRepository.ts` - CRUD messages
- `chunkRepository.ts` - CRUD message chunks
- `userRepository.ts` - CRUD users

##### **1.8. Database Schema**
**Tables:**
- `users` - Thông tin người dùng
- `conversations` - Cuộc hội thoại
- `messages` - Messages trong conversation
- `message_chunks` - Chunks của messages (cho TTS)
- `system_settings` - Cài đặt hệ thống (hot-reload)
- `user_settings` - Cài đặt người dùng
- `user_progress` - Tiến độ học tập

---

### 2. Frontend (React + TypeScript + Vite)

#### **Cấu trúc thư mục:**
```
frontend/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── store/           # Zustand stores
│   ├── hooks/           # Custom hooks
│   ├── contexts/        # React contexts
│   └── utils/           # Utilities
```

#### **Các thành phần chính:**

##### **2.1. Services:**
- `websocketService.ts` - WebSocket client
- `websocketRxService.ts` - RxJS wrapper cho WebSocket
- `conversationApi.ts` - REST API cho conversations
- `ollamaApi.ts` - REST API cho Ollama
- `ttsApi.ts` - REST API cho TTS
- `sttApi.ts` - REST API cho STT
- `authApi.ts` - Authentication API
- `audioQueueService.ts` - Quản lý queue audio playback

##### **2.2. Stores (Zustand):**
- `useConversationStore.ts` - Conversation state
- `useAudioStore.ts` - Audio playback state
- `useSettingsStore.ts` - User settings state

##### **2.3. Pages:**
- `Conversation.tsx` / `ConversationRx.tsx` - Chat interface
- `Conversations.tsx` - Danh sách conversations
- `Login.tsx` / `Register.tsx` - Authentication
- `Dashboard.tsx` - Dashboard chính
- `Settings.tsx` - Cài đặt

##### **2.4. Components:**
- `MessageBubble.tsx` - Hiển thị message
- `TypingIndicator.tsx` - Loading indicator
- `ConversationCard.tsx` - Card conversation
- `Layout.tsx` - Layout wrapper
- `ProtectedRoute.tsx` - Route protection

---

## 🔄 Luồng Hoạt Động

### **Flow 1: User gửi message**

```
1. User nhập/ghi âm message
   ↓
2. Frontend: Gửi message qua REST API
   POST /api/conversations/:id/messages
   ↓
3. Backend: conversationService.sendMessage()
   - Lưu user message vào DB
   - Lấy conversation history từ memory
   ↓
4. Backend: Gọi Ollama API (tutorConversation)
   - System prompt với structured JSON format
   - Conversation history context
   ↓
5. Backend: pipelineService.processResponse()
   - Parse structured JSON response
   - Tạo chunks (text, emotion, icon, pause)
   - Lưu assistant message + chunks vào DB
   - Emit 'conversation:started' event
   ↓
6. Backend: TTS Queue Processing (background)
   - Sequential processing (1 chunk at a time)
   - Generate audio cho từng chunk
   - Emit events: 'chunk:tts-started', 'chunk:tts-completed'
   - Send audio data (base64) qua WebSocket
   ↓
7. Frontend: Nhận events qua WebSocket
   - Update UI với chunks
   - Queue audio để playback
   ↓
8. Frontend: Play audio chunks theo thứ tự
   - AudioQueueService quản lý queue
   - Play với pauses giữa các chunks
```

### **Flow 2: Real-time Updates qua WebSocket**

```
Backend Event → EventBus → WebSocket Service → Frontend

1. Service emit event: eventBus.emitEvent()
2. EventBus broadcast: wsService.broadcastToConversation()
3. Frontend WebSocket nhận message
4. RxJS Observable emit event
5. React component subscribe và update UI
```

---

## 📊 Dữ Liệu & State Management

### **Database (PostgreSQL)**
- **20+ tables** với đầy đủ indexes
- **11 migrations** đã hoàn thành
- Support cho conversations, messages, chunks, users, settings

### **In-Memory State**
- **LangChain Memory** - Conversation summaries
- **WebSocket Connections** - Active connections tracking
- **Event Handlers** - EventBus subscriptions

### **Frontend State (Zustand)**
- `conversationStore` - Conversations, messages, current conversation
- `audioStore` - Audio queue, playback state
- `settingsStore` - User preferences

---

## 🔌 API Endpoints

### **Authentication:**
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Thông tin user hiện tại
- `GET /api/auth/verify` - Verify token

### **Conversations:**
- `GET /api/conversations` - Danh sách conversations
- `GET /api/conversations/:id` - Chi tiết conversation
- `POST /api/conversations` - Tạo conversation mới
- `PUT /api/conversations/:id` - Cập nhật conversation
- `DELETE /api/conversations/:id` - Xóa conversation
- `POST /api/conversations/:id/messages` - Gửi message

### **Ollama:**
- `GET /api/ollama/health` - Health check
- `POST /api/ollama/chat` - Chat với Ollama
- `POST /api/ollama/grammar` - Phân tích ngữ pháp
- `POST /api/ollama/exercise` - Tạo bài tập
- `POST /api/ollama/feedback` - Feedback

### **TTS:**
- `GET /api/tts/health` - Health check
- `POST /api/tts/synthesize` - Tạo audio từ text
- `GET /api/tts/voices` - Danh sách voices
- `GET /api/tts/audio/:fileId` - Lấy audio file

### **STT:**
- `GET /api/stt/health` - Health check
- `POST /api/stt/transcribe` - Transcribe audio

### **Settings:**
- `GET /api/settings/system` - System settings
- `PUT /api/settings/system/:key` - Update system setting
- `GET /api/settings/user/:userId` - User settings
- `PUT /api/settings/user/:userId/:key` - Update user setting

---

## 🎯 Tính Năng Chính

### ✅ **Đã Hoàn Thành:**
1. **Authentication System** - Đầy đủ JWT, bcrypt, sessions
2. **Conversation Management** - CRUD conversations
3. **Real-time Chat** - WebSocket + EventBus
4. **Structured Response Processing** - Parse JSON từ Ollama
5. **TTS Integration** - Audio generation cho chunks
6. **Memory Management** - LangChain với summarization
7. **Event-Driven Architecture** - EventBus với WebSocket
8. **Audio Queue System** - Sequential playback với pauses
9. **Database Schema** - Complete với migrations
10. **Type Safety** - TypeScript strict mode

### ⚠️ **Cần Cải Thiện:**
1. **STT Integration** - Cần test kỹ hơn
2. **Error Handling** - Cần improve user-friendly messages
3. **UI/UX Polish** - Một số màn hình cần refine
4. **Testing** - Frontend tests chưa có
5. **Performance** - Cần optimize cho large conversations

### ❌ **Chưa Có:**
1. **Learning Features UI** - Grammar correction display, vocabulary tracking
2. **Progress Dashboard** - Visual progress tracking
3. **Advanced Conversation Features** - Folders, tags, advanced search
4. **Export/Share** - Conversation export, sharing

---

## 🔧 Cấu Hình & Dependencies

### **Backend Dependencies:**
- `express` - Web framework
- `ws` - WebSocket
- `pg` - PostgreSQL client
- `axios` - HTTP client
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `langchain` - AI memory management
- `pino` - Logging
- `zod` - Schema validation

### **Frontend Dependencies:**
- `react` + `react-dom` - UI framework
- `react-router-dom` - Routing
- `zustand` - State management
- `rxjs` - Reactive programming
- `axios` - HTTP client
- `tailwindcss` - Styling
- `lucide-react` - Icons

### **Environment Variables:**
```env
# Backend
PORT=11200
HOST=0.0.0.0
DATABASE_URL=postgresql://...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=gemma3:12b
TTS_BACKEND_URL=http://localhost:11111
STT_BACKEND_URL=http://localhost:11300
JWT_SECRET=...
FRONTEND_URL=http://localhost:11201

# Frontend
VITE_API_URL=http://localhost:11200
VITE_WS_URL=ws://localhost:11200
```

---

## 📈 Metrics & Statistics

### **Code:**
- **Backend:** ~50+ files, ~10,000+ lines
- **Frontend:** ~30+ files, ~5,000+ lines
- **Tests:** 76 backend tests (all passing)
- **Migrations:** 11 SQL files

### **Features:**
- **Backend Services:** 8+ services
- **API Endpoints:** 30+ endpoints
- **Database Tables:** 20+ tables
- **Frontend Pages:** 6 pages
- **Components:** 10+ components

---

## 🚀 Next Steps (Từ CURRENT_STATUS.md)

### **Immediate:**
1. Test authentication flow
2. Test conversation creation
3. Test message sending
4. Test audio playback
5. Test message history loading

### **Short Term:**
1. Learning Features UI
2. Conversation features (edit title, folders, tags)
3. Advanced search

### **Medium Term:**
1. Conversation sharing/export
2. Multi-language support
3. Performance optimization

---

## 📝 Notes & Observations

### **Điểm Mạnh:**
1. ✅ Architecture rõ ràng, tách biệt concerns
2. ✅ Type-safe với TypeScript strict mode
3. ✅ Event-driven design cho real-time updates
4. ✅ Comprehensive error handling và logging
5. ✅ Database schema đầy đủ với migrations
6. ✅ Testing coverage tốt cho backend

### **Điểm Cần Lưu Ý:**
1. ⚠️ TTS sequential processing có thể chậm với nhiều chunks
2. ⚠️ WebSocket messages có thể lớn (audio base64)
3. ⚠️ Memory service cần monitor cho long conversations
4. ⚠️ Frontend tests chưa có

### **Recommendations:**
1. Consider streaming audio thay vì base64 trong WebSocket
2. Add rate limiting cho API endpoints
3. Implement caching cho frequent queries
4. Add monitoring và metrics collection
5. Consider CDN cho audio files

---

**Tài liệu này được tạo tự động từ phân tích codebase.**  
**Cập nhật lần cuối:** 2025-01-XX

