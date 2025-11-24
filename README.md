# Novel Reader Monorepo

End-to-end toolkit for turning raw novel text into an interactive reading experience with synchronized TTS audio and AI-assisted role detection.

This repository contains every moving piece you need to run the stack locally:

| Layer | Path | Purpose |
| --- | --- | --- |
| VietTTS model weights | `models/dangvansam-viet-tts` | Pretrained Vietnamese voices (24 presets + cloning) |
| TTS backend | `tts/dangvansam-VietTTS-backend` | FastAPI service that wraps VietTTS and serves audio files |
| Role detection (Ollama) | external | Runs `qwen3:8b` locally via Ollama for narrator/role tagging |
| Full app | `novel-app` | Node.js backend + React frontend that orchestrate parsing, audio queues, and playback |

The guide below walks a new teammate from zero to a fully working environment on Windows (PowerShell) or any system with equivalent tooling.

---

## Quick Start (10,000‑ft view)

If you already have Git, Python 3.10+, Node 18, CUDA/cuDNN, and an NVIDIA GPU ready, this is the shortest path to run everything:

```powershell
# 1. Clone
git clone https://github.com/<your-org>/novel-reader.git
cd novel-reader
git lfs install
git lfs pull

# 2. Download VietTTS weights (once)
pip install --upgrade huggingface_hub
huggingface-cli login
huggingface-cli download dangvansam/viet-tts `
  --local-dir models/dangvansam-viet-tts `
  --local-dir-use-symlinks False

# 3. Start VietTTS backend
cd tts/dangvansam-VietTTS-backend
.\setup.ps1
.\start_backend.ps1        # keeps FastAPI running in background

# 4. Start Ollama + pull Qwen3
ollama serve               # new PowerShell tab, keep open
ollama pull qwen3:8b

# 5. Run Novel backend
cd novel-app/backend
npm install
Copy-Item .env.template .env   # create env file if template exists, otherwise create manually
npm run dev

# 6. Run Novel frontend
cd ../frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:11110/api" > .env
npm run dev
```

Then open the Vite URL (default http://127.0.0.1:5173), upload a `.txt` novel, and use the Reader page to generate audio + roles. The rest of this README goes step‑by‑step from a clean Windows install, including GPU drivers, cuDNN, Ollama, and service orchestration.

---

## 1. System Prerequisites (from zero)

### 1.1 OS & Shell

- Windows 10/11 with **PowerShell 7** (preinstalled on recent builds; download from Microsoft Store if missing).
- Developer Mode enabled (Settings → Privacy & security → For developers) to allow long paths.

### 1.2 GPU, Drivers, CUDA & cuDNN

1. Install the latest **NVIDIA Game Ready / Studio Driver** (https://www.nvidia.com/Download/index.aspx).
2. Install **CUDA Toolkit 12.4** (https://developer.nvidia.com/cuda-downloads). During setup, keep default components.
3. Install **cuDNN 9.x for CUDA 12** (https://developer.nvidia.com/cudnn). Extract and copy the `bin`, `include`, and `lib` folders into `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.4\`.
4. Reboot and verify:
   ```powershell
   nvcc --version
   ```

> ⚠️ If you are on CPU-only hardware, you can skip CUDA/cuDNN, but VietTTS inference will be considerably slower.

### 1.3 Developer Tooling

1. **Git** + **Git LFS**  
   - Download Git for Windows (https://git-scm.com/download/win) and select “Enable Git Credential Manager”.  
   - Run `git lfs install` once.
2. **Python 3.10+**  
   - Download from https://www.python.org/downloads/windows/ (check “Add python.exe to PATH”).  
   - Verify: `python --version`.
3. **Node.js 18 LTS**  
   - Download from https://nodejs.org/en/download and choose the LTS installer.  
   - Verify: `node --version` and `npm --version`.
4. **Visual Studio Build Tools** (for native npm modules)  
   - Install “Desktop development with C++” workload from https://visualstudio.microsoft.com/visual-cpp-build-tools/.
5. Optional: **VS Code or Cursor IDE**.

### 1.4 Virtualization & Security

- Disable “Controlled Folder Access” or add exclusions for the repo path; otherwise Python cannot write cache files.
- Ensure Windows Defender / third-party AV does not quarantine `python.exe`, `ollama.exe`, or `uvicorn`.

---

## 2. Clone & Pull Model Assets

```powershell
git clone https://github.com/<your-org>/novel-reader.git
cd novel-reader
git lfs install
git lfs pull
```

If the VietTTS weights are missing (empty folder), download them from Hugging Face (`dangvansam/viet-tts`) which provides the ONNX + PyTorch checkpoints for all 24 preset voices and voice cloning support [^1]:

```powershell
pip install --upgrade huggingface_hub
huggingface-cli login          # paste your HF token (free account)
huggingface-cli download dangvansam/viet-tts `
  --local-dir models/dangvansam-viet-tts `
  --local-dir-use-symlinks False
```

Verify the folder contains `config.yaml`, `llm.pt`, `flow.pt`, `hift.pt`, `speech_embedding.onnx`, and `speech_tokenizer.onnx`. If files are corrupted, rerun `huggingface-cli download dangvansam/viet-tts`.

---

## 3. Setup the DangVanSam VietTTS Backend

The backend is already wired to read the weights above. Use the helper scripts for a Visual Studio–friendly virtualenv (inside `tts/dangvansam-VietTTS-backend`):

```powershell
cd tts/dangvansam-VietTTS-backend
.\setup.ps1          # clones/creates .venv and installs requirements

# Launch in the terminal (interactive logs)
.\run.ps1
# Or keep it running in the background service window
.\start_backend.ps1
# Stop background service when needed
python stop_backend.py
```

PowerShell explains what each script does:

| Script | What it does |
| --- | --- |
| `setup.ps1` | Creates `.venv`, clones dependencies from `tts/viet-tts` if present, installs FastAPI + uvicorn |
| `run.ps1` | Activates `.venv` and runs `uvicorn main:app --reload` (interactive logs) |
| `start_backend.ps1` | Background service (hidden window) ideal for day-to-day development |
| `stop_backend.py` | Gracefully stops the background service |

Default config (overridable via environment vars or `config.py`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `TTS_DEVICE` | `cuda` or `cpu` | `cuda` |
| `API_HOST` / `API_PORT` | Service bind | `0.0.0.0:11111` |
| `TTS_STORAGE_DIR` | Where raw audio gets cached | `storage/audio` |
| `TTS_DEFAULT_EXPIRY_HOURS` | Expiration window (hrs) | `2` |

Health check: open http://127.0.0.1:11111/health to confirm `"status": "healthy"`. Use `Invoke-WebRequest http://127.0.0.1:11111/voices | Select-Object -Expand Content` to verify the 24 VietTTS voices are listed.

---

## 4. Install & Prepare Ollama (Qwen3 8B)

Role detection relies on Qwen3 8B (sometimes nicknamed “Owen3”) running locally.

### 4.1 Install Ollama (Windows)

```powershell
winget install Ollama.Ollama   # or download the MSI from https://ollama.com/download
```

After installation, start the service:

```powershell
ollama serve                   # keep this PowerShell window open
```

### 4.2 Download Qwen3 8B

```powershell
ollama pull qwen3:8b           # ~5 GB download, stores under %USERPROFILE%\.ollama
```

### 4.3 Smoke Test

```powershell
ollama list                    # confirm qwen3:8b is listed
ollama run qwen3:8b "Xin chào" # quick prompt test, Ctrl+C to exit

Invoke-RestMethod http://localhost:11434/api/tags | ConvertTo-Json -Depth 3
```

Keep `ollama serve` running whenever you run the Novel backend. Override defaults if needed:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11434"
$env:OLLAMA_DEFAULT_MODEL = "qwen3:8b"
```

---

## 5. Configure the Novel Backend (`novel-app/backend`)

```powershell
cd novel-app/backend
npm install
```

Create `.env` (because `.env.example` is omitted from VCS). This template covers every variable currently read by the services:

```dotenv
PORT=11110
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173

TTS_BACKEND_URL=http://127.0.0.1:11111
TTS_DEFAULT_SPEAKER=05
TTS_DEFAULT_MODEL=viettts
TTS_DEFAULT_VOICE=quynh
TTS_DEFAULT_EXPIRY_HOURS=365
TTS_AUTO_VOICE=true
TTS_AUTO_CHUNK=true
TTS_MAX_CHARS=256

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_DEFAULT_MODEL=qwen3:8b
OLLAMA_TIMEOUT=600000

STORAGE_DIR=storage/audio
LOG_LEVEL=info
```

> Add any additional env overrides (database paths, presets) as needed. The backend falls back to sane defaults if an entry is missing.

Start the server:

```powershell
npm run dev     # with nodemon + live reload
# or
npm start       # plain node src/server.js
```

Expected logs:

```
🚀 Backend listening on http://0.0.0.0:11110
🎯 API: http://localhost:11110/api
❤️  Health: http://localhost:11110/health
```

Confirm the Express health route: http://localhost:11110/health

Database files live in `novel-app/backend/database/novels.db`. Nodemon automatically reloads when files change.

---

## 6. Configure the React Frontend (`novel-app/frontend`)

```powershell
cd novel-app/frontend
npm install
```

Create `frontend/.env` (Vite uses `VITE_` prefixes):

```dotenv
VITE_API_BASE_URL=http://localhost:11110/api
```

Run the dev server:

```powershell
npm run dev
```

Vite prints a URL similar to `http://127.0.0.1:5173`. Open it after the backend & TTS services are running.

---

## 7. Putting It All Together

1. **Start services in order**
   1. `ollama serve` (ensures `qwen3:8b` is loaded)
   2. `tts/dangvansam-VietTTS-backend` (`run.ps1` or `start_backend.ps1`)
   3. `novel-app/backend` (`npm run dev`)
   4. `novel-app/frontend` (`npm run dev`)
2. **Upload novels** via the frontend (Reader page → upload `.txt`).
3. **Generate audio** per chapter; backend saves organized WAV files to `novel-app/backend/storage/audio/<novel>/<chapter>/paragraph_XXX`.
4. **Role detection** buttons call Ollama; check the Force Regenerate checkbox if the paragraphs already have partial metadata.
5. **Playback** uses the Howler-powered queue with deduplicated backend audio lists.

---

## 8. Directory Cheat Sheet

```
.
├── models/
│   └── dangvansam-viet-tts/         # Core VietTTS weights
├── tts/
│   └── dangvansam-VietTTS-backend/  # FastAPI service + scripts
└── novel-app/
    ├── backend/                     # Express + SQLite + workers
    │   ├── storage/audio/           # Organized WAV output
    │   ├── storage/novels/          # Uploaded raw text
    │   └── logs/backend_*.log       # Rolling logs (huge files ok to delete)
    └── frontend/                    # React + Vite UI
```

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `backend_output.log` grows huge | Disable verbose logging (already done) and periodically clear `novel-app/backend/logs/*.log`. |
| Role detection fails with `qwen3:8b not available` | `ollama pull qwen3:8b`, ensure `OLLAMA_BASE_URL` matches, and rerun `test_ollama_connection.js`. |
| TTS backend missing metadata (binary data in JSON) | Regenerate after the sanitization fix (delete old `paragraph_*_metadata.json` and rerun generation). |
| Audio generation stuck | Inspect backend logs for Skip/Failed metadata files in `storage/audio/.../paragraph_XXX_metadata.json`; rerun `Generate Missing Audio` from UI. |
| Need to clean orphaned audio | `cd novel-app/backend && node scripts/clean_storage.js` |

---

## 10. Next Steps

- Read `novel-app/backend/NOVEL_ROLE_DETECTION_API.md` for batch role detection flows.
- Explore `tts/dangvansam-VietTTS-backend/README.md` for deeper backend options (voice cloning, API URLs).
- Keep Ollama, GPU drivers, and Node.js LTS up to date for best stability.

Happy hacking! 🎧📚

[^1]: Model documentation and download details from DangVanSam’s VietTTS project on Hugging Face, which lists installation workflows, built-in voices, and licensing notes. See https://huggingface.co/dangvansam/viet-tts. 