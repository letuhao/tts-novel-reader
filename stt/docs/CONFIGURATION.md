# Configuration Guide

Complete guide to configuring the STT backend service.

## Environment Variables

All configuration is done through environment variables. Set these before starting the service.

### Device Configuration

#### `STT_DEVICE`

Device to use for inference.

**Options:**
- `cuda` - Use GPU (recommended if available)
- `cpu` - Use CPU (slower, but works without GPU)
- `auto` - Auto-detect (defaults to CUDA if available)

**Default:** `cuda`

**Example:**
```bash
export STT_DEVICE=cuda
```

---

#### `STT_COMPUTE_TYPE`

Numerical precision for computation.

**Options:**
- `float16` - FP16 (best balance of speed and accuracy, recommended)
- `int8_float16` - INT8 with FP16 fallback (faster, slightly less accurate)
- `int8` - Pure INT8 (fastest, less accurate)

**Default:** `float16`

**Recommendations:**
- **RTX 4090:** Use `float16` for best performance
- **Lower VRAM:** Use `int8_float16` if running out of memory
- **CPU:** Use `int8` for faster CPU inference

**Example:**
```bash
export STT_COMPUTE_TYPE=float16
```

---

### Language Configuration

#### `STT_LANGUAGE`

Default language code for transcription.

**Options:**
- Language code (e.g., `en`, `es`, `fr`, `de`, etc.)
- `auto` - Auto-detect language

**Default:** `en`

**Supported Languages:**
See [Whisper documentation](https://github.com/openai/whisper) for full list of 99 supported languages.

**Example:**
```bash
export STT_LANGUAGE=en
```

---

### API Configuration

#### `STT_API_HOST`

Host address to bind the API server.

**Default:** `0.0.0.0` (all interfaces)

**Example:**
```bash
export STT_API_HOST=127.0.0.1  # Localhost only
export STT_API_HOST=0.0.0.0    # All interfaces
```

---

#### `STT_API_PORT`

Port number for the API server.

**Default:** `11210`

**Note:** This port must match the configuration in the English Tutor app backend.

**Example:**
```bash
export STT_API_PORT=11210
```

---

### Performance Configuration

#### `STT_NUM_WORKERS`

Number of CPU workers for audio preprocessing.

**Default:** `4`

**Recommendations:**
- **GPU:** 4-8 workers (preprocessing happens on CPU)
- **CPU:** 2-4 workers (to avoid overloading)

**Example:**
```bash
export STT_NUM_WORKERS=4
```

---

### Logging Configuration

#### `STT_LOG_LEVEL`

Logging verbosity level.

**Options:**
- `debug` - Very verbose (development)
- `info` - Informational messages (default)
- `warning` - Warnings only
- `error` - Errors only
- `critical` - Critical errors only

**Default:** `info`

**Example:**
```bash
export STT_LOG_LEVEL=info
```

---

## Configuration Files

### Using `.env` File

Create a `.env` file in the `stt/` directory:

```env
# Device
STT_DEVICE=cuda
STT_COMPUTE_TYPE=float16

# Language
STT_LANGUAGE=en

# API
STT_API_HOST=0.0.0.0
STT_API_PORT=11210

# Performance
STT_NUM_WORKERS=4

# Logging
STT_LOG_LEVEL=info
```

The service will automatically load these variables if using `python-dotenv`.

---

## Configuration Profiles

### Development Profile

```env
STT_DEVICE=cuda
STT_COMPUTE_TYPE=float16
STT_LANGUAGE=en
STT_API_HOST=127.0.0.1
STT_API_PORT=11210
STT_NUM_WORKERS=4
STT_LOG_LEVEL=debug
```

### Production Profile

```env
STT_DEVICE=cuda
STT_COMPUTE_TYPE=float16
STT_LANGUAGE=en
STT_API_HOST=0.0.0.0
STT_API_PORT=11210
STT_NUM_WORKERS=4
STT_LOG_LEVEL=info
```

### CPU-Only Profile

```env
STT_DEVICE=cpu
STT_COMPUTE_TYPE=int8
STT_LANGUAGE=en
STT_API_HOST=0.0.0.0
STT_API_PORT=11210
STT_NUM_WORKERS=2
STT_LOG_LEVEL=info
```

### Low Memory Profile

```env
STT_DEVICE=cuda
STT_COMPUTE_TYPE=int8_float16
STT_LANGUAGE=en
STT_API_HOST=0.0.0.0
STT_API_PORT=11210
STT_NUM_WORKERS=2
STT_LOG_LEVEL=warning
```

---

## Model Path Configuration

The model path is configured in `stt_backend/config.py`:

```python
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
FASTER_WHISPER_MODEL_PATH = MODELS_DIR / "faster-whisper-large-v3"
```

**Default:** `../models/faster-whisper-large-v3/`

To use a different model path, modify `stt_backend/config.py` or set the path directly in the code.

---

## Runtime Configuration

Some settings can be changed at runtime through API parameters:

- `language` - Override default language per request
- `task` - Choose transcribe or translate
- `beam_size` - Adjust beam search size
- `vad_filter` - Enable/disable VAD
- `return_timestamps` - Include timestamps
- `word_timestamps` - Include word-level timestamps

See [API Reference](./API_REFERENCE.md) for details.

---

## Verification

Check your configuration:

```bash
# Check environment variables
env | grep STT_

# Test service with current config
curl http://localhost:11210/health
```

---

## See Also

- [Installation Guide](./INSTALLATION.md) - Installation instructions
- [Performance Guide](./PERFORMANCE.md) - Performance optimization
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues

