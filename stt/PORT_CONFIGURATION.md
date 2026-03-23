# Port Configuration Reference

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| **STT Backend** | `11210` | Speech-to-Text service (faster-whisper) |
| **English Tutor Backend** | `11200` | Main API server |
| **English Tutor Frontend** | `11201` | Web application |
| **TTS Backend** | `11111` | Text-to-Speech service (Coqui AI) |
| **Ollama** | `11434` | LLM service (default) |
| **PostgreSQL** | `5432` | Database (default) |

## Port Conflicts

✅ **No conflicts detected** - All services use different ports.

## Configuration Files

### STT Backend
- **Config:** `stt/stt_backend/config.py`
- **Default Port:** `11210` (via `STT_API_PORT` env var)
- **Expected by:** English Tutor app at `http://127.0.0.1:11210`

### English Tutor App
- **Backend Config:** `english-tutor-app/backend/src/server.ts`
- **Default Port:** `11200` (via `PORT` env var)
- **Docker Config:** `english-tutor-app/docker-compose.yml`
- **STT URL:** Configured in database settings as `http://127.0.0.1:11210`

## Changing Ports

### STT Backend
```bash
# Set environment variable
export STT_API_PORT=11211  # or any other port

# Or in PowerShell
$env:STT_API_PORT="11211"
```

### English Tutor Backend
```bash
# Set environment variable
export PORT=11202  # or any other port

# Or in PowerShell
$env:PORT="11202"
```

## Checking Port Usage

### Windows (PowerShell)
```powershell
# Check if port is in use
netstat -ano | findstr :11210

# Find process using port
Get-NetTCPConnection -LocalPort 11210 | Select-Object OwningProcess
```

### Linux/Mac
```bash
# Check if port is in use
lsof -i :11210
# or
netstat -tulpn | grep 11210
```

## Troubleshooting

If you get "port already in use" error:

1. **Find the process:**
   ```powershell
   netstat -ano | findstr :11210
   ```

2. **Kill the process:**
   ```powershell
   taskkill /F /PID <process_id>
   ```

3. **Or change the port** using environment variables (see above)

## Integration

The English Tutor app expects the STT backend at:
- **URL:** `http://127.0.0.1:11210`
- **Health Check:** `http://127.0.0.1:11210/health`
- **Transcribe Endpoint:** `POST http://127.0.0.1:11210/api/stt/transcribe`

This is configured in:
- Database settings table: `stt.backend_url`
- Docker compose: `STT_BACKEND_URL` environment variable

