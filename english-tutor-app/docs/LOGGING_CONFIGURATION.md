# Logging Configuration

**Date:** 2024-12-21  
**Purpose:** Configure debug-level logging with file rotation

## 📝 Overview

The backend now supports:
- **Debug-level logging** by default in development
- **File logging** with automatic rotation
- **Date-based file separation** (one set of files per day)
- **Size-based rotation** (10MB per file)
- **Multiple files per day** when size limit is reached

---

## 🔧 Configuration

### Log Level

The log level is automatically set based on environment:

- **Development:** `debug` (shows all logs)
- **Production:** `info` (shows info and above)

You can override with the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=debug  # fatal, error, warn, info, debug, trace
```

### File Logging

File logging is **enabled by default**. To disable:

```bash
FILE_LOGGING=false
```

### Log Directory

Logs are stored in: `backend/logs/`

You can customize the directory by setting `LOG_DIR` environment variable (not yet implemented in config, but can be added).

---

## 📁 Log File Format

### File Naming

Log files follow this pattern:
```
app-YYYY-MM-DD-N.log
```

Where:
- `YYYY-MM-DD` = Date (e.g., `2024-12-21`)
- `N` = File index (0, 1, 2, ...) for multiple files per day

### Examples

```
logs/
  app-2024-12-21-0.log    # First file of the day (up to 10MB)
  app-2024-12-21-1.log    # Second file of the day (if first exceeds 10MB)
  app-2024-12-21-2.log    # Third file of the day (if second exceeds 10MB)
  app-2024-12-22-0.log    # First file of next day
  app-2024-12-22-1.log    # Second file of next day
```

---

## 🔄 Rotation Rules

### 1. Size-Based Rotation

- **Max file size:** 10MB
- When a file reaches 10MB, a new file is created with the next index
- Files are created on the same day until the day changes

### 2. Date-Based Rotation

- **Daily rotation:** New day = new file set (index resets to 0)
- At midnight, the system starts a new file with index 0 for the new date

### 3. File Retention

- **Max files:** 30 days of logs
- Old files are automatically deleted after 30 days
- This prevents unlimited disk usage

---

## 📊 Log Output

### Console Output

In development, logs are pretty-printed with colors:
```
[14:30:00.000] INFO (conversation-pipeline): ✅ [TTS] TTS generated successfully
  chunkIndex: 0
  textLength: 50
  timeMs: 2500
```

In production, logs are plain JSON:
```json
{"level":"INFO","time":"2024-12-21T14:30:00.000Z","service":"conversation-pipeline","msg":"✅ [TTS] TTS generated successfully"}
```

### File Output

All logs are written to files in JSON format (for easy parsing):
```json
{"level":"INFO","time":"2024-12-21T14:30:00.000Z","service":"conversation-pipeline","chunkIndex":0,"textLength":50,"timeMs":2500,"msg":"✅ [TTS] TTS generated successfully"}
```

---

## 🎯 Log Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| **fatal** | System is unusable | Critical system failures |
| **error** | Error events | Exceptions, failed operations |
| **warn** | Warning events | Deprecations, recoverable errors |
| **info** | Informational messages | General application flow |
| **debug** | Debug messages | Detailed debugging information |
| **trace** | Trace messages | Very detailed tracing |

### Current Configuration

- **Development:** `debug` (shows info, warn, error, fatal, debug)
- **Production:** `info` (shows info, warn, error, fatal)

---

## 🔍 Viewing Logs

### Real-Time Console

Logs are automatically printed to console in development mode.

### Log Files

View logs from files:

```bash
# View today's logs
cat backend/logs/app-2024-12-21-0.log

# View all logs from today
cat backend/logs/app-2024-12-21-*.log

# Follow logs in real-time (Linux/Mac)
tail -f backend/logs/app-2024-12-21-0.log

# Search logs
grep "ERROR" backend/logs/app-2024-12-21-*.log

# Count log entries
wc -l backend/logs/app-2024-12-21-*.log
```

### Windows PowerShell

```powershell
# View today's logs
Get-Content backend\logs\app-2024-12-21-0.log

# Follow logs in real-time
Get-Content backend\logs\app-2024-12-21-0.log -Wait

# Search logs
Select-String "ERROR" backend\logs\app-2024-12-21-*.log
```

---

## 🛠️ Implementation Details

### Logger Setup

The logger is configured in `backend/src/utils/logger.ts`:

1. **Console Stream:** Pretty-printed in dev, JSON in prod
2. **File Stream:** Always JSON format with rotation
3. **Multi-Stream:** Both console and file simultaneously

### Rotation Library

Uses `rotating-file-stream` package:
- Handles both size and date-based rotation
- Automatic file cleanup
- Thread-safe file writing

### Performance

- **Non-blocking:** File writes are asynchronous
- **Buffered:** Logs are buffered for better performance
- **Low overhead:** Pino is one of the fastest loggers

---

## 📋 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Logging level |
| `FILE_LOGGING` | `true` | Enable/disable file logging |
| `NODE_ENV` | `development` | Environment (affects defaults) |

---

## 🎨 Log Format Examples

### Debug Log
```json
{
  "level": "DEBUG",
  "time": "2024-12-21T14:30:00.000Z",
  "service": "conversation-pipeline",
  "chunkIndex": 0,
  "text": "Hello!",
  "msg": "🎤 [TTS] Starting TTS generation for chunk"
}
```

### Info Log
```json
{
  "level": "INFO",
  "time": "2024-12-21T14:30:00.000Z",
  "service": "conversation-pipeline",
  "totalTimeMs": 6300,
  "msg": "✅ [CHAT] First chunk ready, returning to client"
}
```

### Error Log
```json
{
  "level": "ERROR",
  "time": "2024-12-21T14:30:00.000Z",
  "service": "tts-service",
  "err": {
    "type": "Error",
    "message": "TTS backend unavailable",
    "stack": "..."
  },
  "msg": "❌ [TTS] TTS generation error"
}
```

---

## ✅ Status

- ✅ Debug-level logging enabled
- ✅ File logging with rotation
- ✅ Date-based file separation
- ✅ Size-based rotation (10MB)
- ✅ Multiple files per day support
- ✅ Automatic cleanup (30 days)

---

**Next Steps:**
- Monitor log file sizes
- Adjust rotation settings if needed
- Set up log aggregation (optional)

