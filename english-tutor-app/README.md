# English Tutor App

AI-powered English learning platform using Ollama as the main brain, Coqui TTS for speech synthesis, and Whisper for speech recognition.

## 🏗️ Project Structure

```
english-tutor-app/
├── docs/              # Documentation
├── backend/           # Backend API (TypeScript + Express)
├── frontend/          # Frontend App (React + TypeScript + Vite)
└── shared/            # Shared types
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Ollama installed with `gemma2:12b` model
- TTS Backend service (Coqui AI) running on port 11111

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Backend will run on `http://localhost:11200`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Frontend will run on `http://localhost:11201`

## 📚 Documentation

See `docs/` directory for detailed documentation:
- [Overview](./docs/OVERVIEW.md)
- [AI Models Integration](./docs/AI_MODELS_INTEGRATION.md)
- [Curriculum Design](./docs/CURRICULUM_DESIGN.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)

## 🔧 Development

### TypeScript Strict Mode

Both backend and frontend use **strict TypeScript** with:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- And more strict checks

### Type Checking

```bash
# Backend
cd backend
npm run type-check

# Frontend
cd frontend
npm run type-check
```

### Linting

```bash
# Backend
cd backend
npm run lint
npm run lint:fix

# Frontend
cd frontend
npm run lint
npm run lint:fix
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test
npm run test:watch
npm run test:coverage
```

## 📦 Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## 🎯 Current Status

- ✅ Project structure setup
- ✅ TypeScript strict mode configured
- ✅ Backend server foundation
- ✅ Frontend foundation
- ⏳ Ollama service integration (in progress)
- ⏳ TTS/STT integration (planned)

## 📝 License

MIT

