# English Tutor App Integration

Detailed guide for integrating the STT backend with the English Tutor application.

## Overview

The STT backend is designed to work seamlessly with the English Tutor app backend. This guide covers the complete integration process.

## Architecture

```
┌─────────────────────────────────────────┐
│      English Tutor Frontend             │
│  (React, TypeScript, Vite)              │
└──────────────┬──────────────────────────┘
               │
               │ HTTP/WebSocket
               │
┌──────────────▼──────────────────────────┐
│   English Tutor Backend                  │
│   (Node.js, Express, TypeScript)         │
│                                          │
│   ┌──────────────────────────────┐     │
│   │   STT Service Wrapper         │     │
│   │   (sttService.ts)             │     │
│   └──────────┬───────────────────┘     │
└──────────────┼──────────────────────────┘
               │
               │ HTTP REST API
               │
┌──────────────▼──────────────────────────┐
│   STT Backend Service                    │
│   (Python, FastAPI, faster-whisper)      │
│   Port: 11210                            │
└──────────────────────────────────────────┘
```

## Integration Steps

### Step 1: Create STT Service Wrapper

Create `english-tutor-app/backend/src/services/stt/sttService.ts`:

```typescript
import axios, { type AxiosInstance } from 'axios';
import { getSystemSettingsService } from '../settings/systemSettingsService.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger({ service: 'stt' });

export interface STTRequest {
  audio: Buffer | File;
  language?: string;
  task?: 'transcribe' | 'translate';
  beamSize?: number;
  vadFilter?: boolean;
  returnTimestamps?: boolean;
  wordTimestamps?: boolean;
}

export interface STTResponse {
  success: boolean;
  data?: {
    text: string;
    language: string;
    languageProbability?: number;
    segments: Array<{
      text: string;
      start: number;
      end: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        probability: number;
      }>;
    }>;
  };
  error?: string;
}

export class STTService {
  private readonly client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.STT_BACKEND_URL ?? 'http://127.0.0.1:11210';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes for long audio
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsService = getSystemSettingsService();
      const sttUrl = await settingsService.getValue<string>(
        'stt.backend_url',
        this.baseURL
      );
      this.baseURL = sttUrl;
      this.client.defaults.baseURL = this.baseURL;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to load STT settings, using defaults');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadSettings();
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error({ err: error }, 'STT service not available');
      return false;
    }
  }

  async transcribe(request: STTRequest): Promise<STTResponse> {
    try {
      await this.loadSettings();

      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      
      // Add audio file
      if (request.audio instanceof Buffer) {
        formData.append('audio', request.audio, {
          filename: 'audio.wav',
          contentType: 'audio/wav',
        });
      } else {
        formData.append('audio', request.audio);
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (request.language) params.append('language', request.language);
      if (request.task) params.append('task', request.task);
      if (request.beamSize) params.append('beam_size', request.beamSize.toString());
      if (request.vadFilter !== undefined) params.append('vad_filter', request.vadFilter.toString());
      if (request.returnTimestamps !== undefined) params.append('return_timestamps', request.returnTimestamps.toString());
      if (request.wordTimestamps !== undefined) params.append('word_timestamps', request.wordTimestamps.toString());

      const response = await this.client.post(
        `/api/stt/transcribe?${params.toString()}`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      logger.error({ err: error }, 'STT transcription failed');
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.detail || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      };
    }
  }
}

// Singleton instance
let sttServiceInstance: STTService | null = null;

export function getSTTService(): STTService {
  if (sttServiceInstance === null) {
    sttServiceInstance = new STTService();
  }
  return sttServiceInstance;
}
```

### Step 2: Create API Routes

Create `english-tutor-app/backend/src/routes/stt.ts`:

```typescript
import express, { type Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getSTTService } from '../services/stt/sttService.js';
import { createChildLogger } from '../utils/logger.js';

const router: Router = express.Router();
const logger = createChildLogger({ component: 'stt-routes' });
const upload = multer({ storage: multer.memoryStorage() });

const TranscribeRequestSchema = z.object({
  language: z.string().optional(),
  task: z.enum(['transcribe', 'translate']).optional(),
  beamSize: z.number().int().min(1).max(20).optional(),
  vadFilter: z.boolean().optional(),
  returnTimestamps: z.boolean().optional(),
  wordTimestamps: z.boolean().optional(),
});

/**
 * GET /api/stt/health
 * Check STT service health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const sttService = getSTTService();
    const isAvailable = await sttService.isAvailable();

    res.json({
      success: true,
      data: {
        available: isAvailable,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(500).json({
      success: false,
      error: 'Failed to check STT service health',
    });
  }
});

/**
 * POST /api/stt/transcribe
 * Transcribe audio file
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Audio file is required',
      });
      return;
    }

    const validationResult = TranscribeRequestSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: validationResult.error.errors,
      });
      return;
    }

    const sttService = getSTTService();
    const result = await sttService.transcribe({
      audio: req.file.buffer,
      ...validationResult.data,
    });

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    logger.info({ 
      textLength: result.data?.text.length,
      language: result.data?.language 
    }, 'STT transcription completed');

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'STT transcription request failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process STT request',
    });
  }
});

export default router;
```

### Step 3: Register Routes

Update `english-tutor-app/backend/src/server.ts`:

```typescript
import sttRouter from './routes/stt.js';

// ... existing code ...

// Register STT routes
app.use('/api/stt', sttRouter);
```

### Step 4: Install Dependencies

Add to `english-tutor-app/backend/package.json`:

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

Then run:
```bash
npm install
```

## Usage Examples

### Conversation Flow

```typescript
// 1. User speaks → Frontend records audio
const audioBlob = await recordAudio();

// 2. Frontend sends audio to backend
const formData = new FormData();
formData.append('audio', audioBlob);

const response = await fetch('/api/stt/transcribe?language=en', {
  method: 'POST',
  body: formData,
});

const { data } = await response.json();

// 3. Backend sends transcription to Ollama
const ollamaResponse = await fetch('/api/ollama/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [
      { role: 'user', content: data.text }
    ]
  })
});

// 4. Ollama responds → TTS → Audio to user
```

### Pronunciation Practice

```typescript
// Student speaks a word
const transcription = await sttService.transcribe({
  audio: studentAudio,
  language: 'en',
  wordTimestamps: true,
});

// Compare with expected pronunciation
const expectedText = "pronunciation";
const spokenText = transcription.data?.text.toLowerCase().trim();

// Analyze pronunciation accuracy
const accuracy = calculateAccuracy(spokenText, expectedText);
```

## Configuration

The STT backend URL is configured in system settings:

```sql
-- Already exists in system_settings
INSERT INTO system_settings (key, value, type, description, category)
VALUES ('stt.backend_url', 'http://127.0.0.1:11210', 'string', 'STT backend service URL', 'stt');
```

This allows hot-reloading of the STT backend URL without restarting the service.

## Testing

### Test STT Service

```typescript
import { getSTTService } from './services/stt/sttService.js';
import fs from 'fs';

const sttService = getSTTService();

// Check availability
const isAvailable = await sttService.isAvailable();
console.log('STT available:', isAvailable);

// Transcribe audio
const audioBuffer = fs.readFileSync('test_audio.wav');
const result = await sttService.transcribe({
  audio: audioBuffer,
  language: 'en',
  returnTimestamps: true,
});

console.log('Transcription:', result.data?.text);
```

## Error Handling

The STT service includes comprehensive error handling:

- **Service unavailable:** Returns `available: false` in health check
- **Transcription errors:** Returns error message in response
- **Timeout handling:** 5-minute timeout for long audio files
- **Retry logic:** Can be implemented in the service wrapper

## Performance Considerations

- **Model loading:** First request may be slower (model preloaded at startup)
- **Concurrent requests:** Consider request queuing for multiple simultaneous requests
- **Audio size:** Large audio files may take longer to process
- **GPU memory:** Monitor VRAM usage on RTX 4090

## See Also

- [API Reference](../docs/API_REFERENCE.md) - Complete API documentation
- [Integration Guide](../docs/INTEGRATION.md) - General integration patterns
- [Configuration Guide](../docs/CONFIGURATION.md) - Configuration options

