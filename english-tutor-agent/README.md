# English Tutor Agent - LangGraph Multi-Agent System

Multi-agent system for English Tutor App using LangGraph.

---

## 📚 Documentation

See [docs/README.md](./docs/README.md) for complete documentation.

**Quick Links:**
- [Design Documents](./docs/02-design/) - System design
- [Implementation Guides](./docs/03-implementation/) - Implementation guides
- [Infrastructure Setup](./docs/03-implementation/INFRASTRUCTURE_SETUP.md) - Docker setup

---

## 🚀 Quick Start

### 1. Setup Infrastructure

```bash
# Copy environment file
cp env.example .env

# Edit .env with your configuration
# Then start services
docker compose up -d
```

See [Infrastructure Setup Guide](./docs/03-implementation/INFRASTRUCTURE_SETUP.md) for details.

### 2. Verify Services

```bash
# Check services
docker compose ps

# Check health
curl http://localhost:11300/health
```

---

## 📁 Project Structure

```
english-tutor-agent/
├── src/              # Source code
│   ├── agents/       # Agent implementations
│   ├── workflows/    # LangGraph workflows
│   ├── services/     # Service layer
│   ├── models/       # Data models
│   └── utils/        # Utilities
├── tests/            # Tests
├── docs/             # Documentation
├── docker-compose.yml # Docker compose
├── Dockerfile        # Docker image
├── requirements.txt  # Python dependencies
└── README.md        # This file
```

---

## 🏗️ Architecture

```
Frontend → API Gateway → LangGraph Workflow → Services → Database
                                    ↓
                            State & Checkpointing
```

**Key Components:**
- **Router Agent** - Intent detection and routing
- **Specialized Agents** - Tutor, Grammar, Pronunciation, Exercise
- **Response Formatter** - Format responses
- **Pipeline Node** - TTS/STT processing
- **State Management** - LangGraph state + checkpointing

---

## 🛠️ Development

### Local Development

```bash
# Start only database
docker compose up -d postgres

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run service
python -m uvicorn src.main:app --reload --port 11300
```

---

## 📝 Environment Variables

See `env.example` for all configuration options.

**Key Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `OLLAMA_BASE_URL` - Ollama service URL
- `API_PORT` - Agent service port (default: 11300)

---

## ✅ Status

- ✅ Design complete
- ⏳ Infrastructure setup (this repo)
- ⏳ Implementation in progress

---

**Last Updated:** 2025-01-XX

