# Novel Reader Backend / Backend Đọc Truyện

## 🚀 Setup / Cài đặt

### Prerequisites / Yêu cầu

- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation / Cài đặt

```bash
cd backend
npm install
```

### Configuration / Cấu hình

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
- `PORT` - Backend port (default: 11110)
- `TTS_BACKEND_URL` - TTS backend URL (default: http://127.0.0.1:11111)
- `TTS_DEFAULT_SPEAKER` - Default speaker ID (default: 05)
- `TTS_DEFAULT_EXPIRY_HOURS` - Default expiration (default: 8760 = 365 days)

### Start Server / Khởi động Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints / Điểm cuối API

See API documentation at: http://localhost:11110/api/docs (when running)

## 🔧 Features / Tính năng

- ✅ Novel file parsing
- ✅ Chapter/paragraph extraction
- ✅ TTS integration
- ✅ Audio storage management
- ✅ User progression tracking
- ✅ SQLite database

