# Startup Scripts - Scripts Khởi Động
## English Tutor Agent - Startup Guide

**Date:** 2025-12-22

---

## 🚀 Quick Start

### Start All Services (Recommended)

From project root:
```powershell
# Python script (recommended - no antivirus issues)
python start_all_agents.py

# OR PowerShell script (may be blocked by antivirus)
.\start_all_agents.ps1
```

This will start:
- ✅ PostgreSQL (Docker)
- ✅ Coqui TTS Backend (port 11111)
- ✅ Whisper STT Backend (port 11210)
- ✅ English Tutor Agent (port 11300)

**Note:** If PowerShell script is blocked by antivirus, use Python script instead!

### Start Agent Only

```powershell
cd english-tutor-agent
.\start_agent.ps1
# or
python start_agent.py
```

### Stop All Services

From project root:
```powershell
# Python script (recommended - no antivirus issues)
python stop_all_agents.py

# OR PowerShell script (may be blocked by antivirus)
.\stop_all_agents.ps1
```

### Stop Agent Only

```powershell
cd english-tutor-agent
.\stop_agent.ps1
# or
python stop_agent.py
```

---

## 📋 Available Scripts

### Main Scripts (Root)

| Script | Purpose | Type | Notes |
|--------|---------|------|-------|
| `start_all_agents.py` | Start all services | Python | ✅ Recommended (no antivirus issues) |
| `start_all_agents.ps1` | Start all services | PowerShell | ⚠️ May be blocked by antivirus |
| `stop_all_agents.py` | Stop all services | Python | ✅ Recommended (no antivirus issues) |
| `stop_all_agents.ps1` | Stop all services | PowerShell | ⚠️ May be blocked by antivirus |

### Agent Scripts (english-tutor-agent/)

| Script | Purpose | Type |
|--------|---------|------|
| `start_agent.ps1` | Start agent service | PowerShell |
| `start_agent.py` | Start agent service | Python |
| `stop_agent.ps1` | Stop agent service | PowerShell |
| `stop_agent.py` | Stop agent service | Python |

---

## 🔧 Service Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5433 | localhost:5433 |
| Coqui TTS | 11111 | http://127.0.0.1:11111 |
| Whisper STT | 11210 | http://127.0.0.1:11210 |
| Ollama | 11434 | http://localhost:11434 |
| English Tutor Agent | 11300 | http://127.0.0.1:11300 |

---

## 📝 Script Details

### start_all_agents.ps1

**Features:**
- Starts PostgreSQL (Docker)
- Starts Coqui TTS Backend
- Starts Whisper STT Backend
- Checks Ollama status
- Starts English Tutor Agent
- Verifies all services

**Usage:**
```powershell
.\start_all_agents.ps1
```

### start_agent.ps1 / start_agent.py

**Features:**
- Checks if agent already running
- Creates virtual environment if needed
- Installs dependencies if needed
- Starts agent in background
- Saves process ID
- Verifies health endpoint

**Usage:**
```powershell
cd english-tutor-agent
.\start_agent.ps1
```

---

## ✅ Verification

After starting, scripts will check:
- ✅ Service health endpoints
- ✅ Port availability
- ✅ Process IDs

**Check manually:**
```powershell
# Check agent
curl http://127.0.0.1:11300/health

# Check TTS
curl http://127.0.0.1:11111/health

# Check STT
curl http://127.0.0.1:11210/health

# Check Ollama
curl http://localhost:11434/api/tags
```

---

## 📊 Logs

### Agent Logs
- Location: `english-tutor-agent/logs/`
- Files:
  - `agent_output.log` - Standard output
  - `agent_error.log` - Error output
  - `agent_pid.txt` - Process ID

### TTS Logs
- Location: `tts/coqui-ai-tts-backend/logs/`

### STT Logs
- Check STT window output

---

## 🐛 Troubleshooting

### Agent won't start

1. **Check port 11300:**
   ```powershell
   netstat -ano | findstr :11300
   ```

2. **Check logs:**
   ```powershell
   Get-Content english-tutor-agent\logs\agent_error.log
   ```

3. **Check dependencies:**
   ```powershell
   cd english-tutor-agent
   pip install -r requirements.txt
   ```

### TTS won't start

1. Check port 11111
2. Check TTS logs: `tts\coqui-ai-tts-backend\logs\`
3. Verify TTS dependencies installed

### STT won't start

1. Check port 11210
2. Verify cuDNN is configured
3. Check STT window for errors

### PostgreSQL issues

```powershell
cd english-tutor-agent
docker compose ps postgres
docker compose logs postgres
```

---

## 🔄 Prerequisites

Before running scripts:

1. **Docker** - For PostgreSQL
2. **Python 3.11+** - For all services
3. **Ollama** - Should be running (or started manually)
4. **cuDNN** - For STT GPU acceleration (optional)

---

## 📚 Related Documentation

- [Infrastructure Setup](./docs/03-implementation/INFRASTRUCTURE_SETUP.md)
- [Quick Start Guide](./docs/03-implementation/QUICK_START.md)
- [Docker Setup](./docs/03-implementation/DOCKER_SETUP_COMPLETE.md)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22

