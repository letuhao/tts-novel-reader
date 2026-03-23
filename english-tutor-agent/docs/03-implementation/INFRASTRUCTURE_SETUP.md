# Infrastructure Setup - Thiết Lập Hạ Tầng
## Hướng Dẫn Setup Infrastructure Cho LangGraph Agent Service

**Date:** 2025-01-XX  
**Status:** ✅ Ready to Use

---

## 📋 Overview

Complete guide for setting up infrastructure for the LangGraph multi-agent system.

---

## 🏗️ Infrastructure Components

### 1. **PostgreSQL Database**
- **Purpose:** LangGraph checkpointing + application data
- **Version:** PostgreSQL 18 (latest stable)
- **Port:** 5433 (default, configurable)
- **Image:** `postgres:18-alpine`

### 2. **Python Agent Service**
- **Purpose:** LangGraph workflow execution
- **Version:** Python 3.11
- **Port:** 11300 (default, configurable)
- **Framework:** FastAPI + LangGraph

### 3. **Ollama** (Optional in Docker)
- **Purpose:** LLM service
- **Version:** Latest
- **Port:** 11434 (or 11435 if in Docker)
- **Note:** Can use existing Ollama on host

### 4. **TTS/STT Services**
- **Purpose:** Text-to-Speech and Speech-to-Text
- **Note:** Use existing services on host
- **Ports:** 11111 (TTS), 11210 (STT)

---

## 🚀 Quick Start

### Prerequisites

1. **Docker & Docker Compose**
   ```bash
   # Check Docker version
   docker --version
   
   # Check Docker Compose version
   docker compose version
   ```
   
   If not installed, download from: https://www.docker.com/products/docker-desktop

2. **Existing Services** (if using)
   - Ollama running on `localhost:11434`
   - TTS service on `localhost:11111`
   - STT service on `localhost:11210`

---

### Step 1: Clone and Navigate

```bash
cd D:\Works\source\novel-reader\english-tutor-agent
```

---

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your configuration
# Windows (using notepad)
notepad .env

# Or use your preferred editor
```

**Key configuration:**
- `DATABASE_URL` - Database connection string
- `OLLAMA_BASE_URL` - Ollama service URL
- `API_PORT` - Agent service port (default: 11300)

---

### Step 3: Build and Start Services

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

---

### Step 4: Verify Services

#### Check PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it english-tutor-agent-postgres psql -U english_tutor_agent -d english_tutor_agent

# Check if LangGraph tables exist (after first run)
\dt checkpoints*
```

#### Check Agent Service

```bash
# Health check
curl http://localhost:11300/health

# Or in browser
http://localhost:11300/health
```

---

## 📊 Service Details

### PostgreSQL Service

**Configuration:**
- **Container:** `english-tutor-agent-postgres`
- **Image:** `postgres:18-alpine`
- **Port:** 5433 (host) → 5432 (container)
- **Database:** `english_tutor_agent`
- **User:** `english_tutor_agent`
- **Volume:** `postgres_data` (persistent storage)

**Connection String:**
```
postgresql://english_tutor_agent:english_tutor_agent_password@localhost:5433/english_tutor_agent
```

**Access:**
```bash
# From host
psql -h localhost -p 5433 -U english_tutor_agent -d english_tutor_agent

# From container
docker exec -it english-tutor-agent-postgres psql -U english_tutor_agent -d english_tutor_agent
```

---

### Agent Service

**Configuration:**
- **Container:** `english-tutor-agent-service`
- **Port:** 11300
- **Health Check:** `http://localhost:11300/health`
- **API Docs:** `http://localhost:11300/docs` (FastAPI auto-generated)

**Logs:**
```bash
# View logs
docker compose logs -f agent-service

# View last 100 lines
docker compose logs --tail=100 agent-service
```

**Restart:**
```bash
# Restart service
docker compose restart agent-service

# Rebuild and restart
docker compose up -d --build agent-service
```

---

## 🔧 Configuration Options

### Option 1: Separate Database (Default)

Use dedicated PostgreSQL instance for agent service:

```yaml
# docker-compose.yml
postgres:
  image: postgres:18-alpine
  ports:
    - "5433:5432"  # Different port
```

**Pros:**
- ✅ Isolated from existing system
- ✅ Easy to manage
- ✅ No conflicts

**Cons:**
- ⚠️ Extra database instance
- ⚠️ More resources

---

### Option 2: Shared Database

Connect to existing PostgreSQL from english-tutor-app:

```yaml
# docker-compose.yml
# Remove postgres service

agent-service:
  environment:
    DATABASE_URL: postgresql://english_tutor:english_tutor_password@host.docker.internal:5432/english_tutor
```

**Pros:**
- ✅ Single database instance
- ✅ Can share data

**Cons:**
- ⚠️ Coupled with existing system
- ⚠️ Need to ensure compatibility

**Note:** If using shared database, ensure:
- LangGraph checkpoint tables won't conflict
- Database has sufficient permissions

---

### Option 3: Ollama in Docker

Uncomment Ollama service in `docker-compose.yml`:

```yaml
ollama:
  image: ollama/ollama:latest
  container_name: english-tutor-agent-ollama
  ports:
    - "11435:11434"
```

**After starting:**
```bash
# Pull model
docker exec english-tutor-agent-ollama ollama pull gemma3:12b

# Update .env
OLLAMA_BASE_URL=http://ollama:11434
```

---

## 🛠️ Development Setup

### Local Development (Without Docker)

For development, you can run services locally:

```bash
# 1. Start PostgreSQL only
docker compose up -d postgres

# 2. Run agent service locally
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn src.main:app --reload --port 11300
```

**Benefits:**
- ✅ Faster iteration
- ✅ Direct debugging
- ✅ Hot reload

---

## 📝 Common Commands

### Docker Compose Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f agent-service

# Rebuild services
docker compose up -d --build

# Restart service
docker compose restart agent-service

# Check service status
docker compose ps

# Execute command in container
docker compose exec agent-service bash
docker compose exec postgres psql -U english_tutor_agent -d english_tutor_agent
```

---

### Database Commands

```bash
# Create backup
docker exec english-tutor-agent-postgres pg_dump -U english_tutor_agent english_tutor_agent > backup.sql

# Restore backup
docker exec -i english-tutor-agent-postgres psql -U english_tutor_agent english_tutor_agent < backup.sql

# View database size
docker exec english-tutor-agent-postgres psql -U english_tutor_agent -c "SELECT pg_size_pretty(pg_database_size('english_tutor_agent'));"
```

---

## 🔍 Troubleshooting

### Issue: Port Already in Use

**Error:** `Bind for 0.0.0.0:11300 failed: port is already allocated`

**Solution:**
```bash
# Change port in .env
API_PORT=11301

# Restart services
docker compose up -d
```

---

### Issue: Cannot Connect to Database

**Error:** `could not connect to server`

**Solution:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Verify connection string in .env
DATABASE_URL=postgresql://english_tutor_agent:password@postgres:5432/english_tutor_agent
```

---

### Issue: Ollama Connection Failed

**Error:** `Connection refused to Ollama`

**Solution:**
```bash
# Check if Ollama is running on host
curl http://localhost:11434/api/tags

# For Docker on Windows/Mac, use host.docker.internal
OLLAMA_BASE_URL=http://host.docker.internal:11434

# For Linux, use host network or service name
```

---

### Issue: LangGraph Checkpoint Tables Not Created

**Solution:**
- Tables are auto-created on first workflow execution
- Ensure database connection is working
- Check agent service logs for errors

---

## ✅ Verification Checklist

After setup, verify:

- [ ] PostgreSQL is running
- [ ] Agent service is running
- [ ] Health check endpoint works: `curl http://localhost:11300/health`
- [ ] Database connection works
- [ ] Ollama connection works (if using)
- [ ] TTS/STT services accessible (if using)
- [ ] API docs accessible: `http://localhost:11300/docs`

---

## 🔐 Security Notes

### Production Considerations

1. **Change default passwords:**
   ```env
   POSTGRES_PASSWORD=strong_random_password
   ```

2. **Use secrets management:**
   - Docker secrets
   - Environment variables from secure storage
   - Kubernetes secrets

3. **Network security:**
   - Use internal networks only
   - Expose ports only when necessary
   - Use reverse proxy (nginx, traefik)

4. **Database security:**
   - Use strong passwords
   - Limit connections
   - Enable SSL/TLS for connections

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Ollama Docker Image](https://hub.docker.com/r/ollama/ollama)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ Ready to Use

