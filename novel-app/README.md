# Novel Reader App / Ứng dụng Đọc Truyện

## 🎯 Overview / Tổng quan

Node.js application for reading novels with TTS audio generation:
- Parse large novel text files
- Generate audio via TTS backend
- Audio storage with expiration (365 days default)
- User progression tracking
- Audio playback

Ứng dụng Node.js để đọc truyện với tạo audio TTS:
- Parse file text novel lớn
- Tạo audio qua TTS backend
- Lưu trữ audio với hết hạn (365 ngày mặc định)
- Theo dõi tiến độ người dùng
- Phát audio

## 📁 Project Structure / Cấu trúc Dự án

```
novel-app/
├── backend/          # Node.js Backend
├── frontend/         # React Frontend (to be created)
├── novels/           # Novel text files
└── storage/          # Generated audio files
```

## 🚀 Quick Start / Bắt đầu Nhanh

### Backend Setup / Thiết lập Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env to configure TTS backend URL
npm run dev
```

Backend runs on: http://localhost:3000

### Frontend Setup / Thiết lập Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## 📚 Documentation / Tài liệu

- **ARCHITECTURE.md** - Architecture overview
- **PROJECT_PLAN.md** - Detailed project plan
- **SUGGESTIONS.md** - Feature suggestions

---

**See backend/README.md for backend setup details!**  
**Xem backend/README.md để biết chi tiết thiết lập backend!**

