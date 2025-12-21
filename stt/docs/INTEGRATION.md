# Integration Guide

Guide for integrating the STT backend with other services and applications.

## Table of Contents

- [English Tutor App Integration](#english-tutor-app-integration)
- [Node.js/TypeScript Integration](#nodejstypescript-integration)
- [Python Integration](#python-integration)
- [Microservice Architecture](#microservice-architecture)
- [Error Handling](#error-handling)

---

## English Tutor App Integration

### Backend Service Integration

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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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

      const formData = new FormData();
      
      // Add audio file
      if (request.audio instanceof Buffer) {
        const blob = new Blob([request.audio], { type: 'audio/wav' });
        formData.append('audio', blob, 'audio.wav');
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
          headers: {
            'Content-Type': 'multipart/form-data',
          },
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

### API Routes

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

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'STT transcription request failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process STT request',
    });
  }
});

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

export default router;
```

---

## Node.js/TypeScript Integration

### Basic Integration

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

class STTClient {
  private baseURL: string;

  constructor(baseURL = 'http://localhost:11210') {
    this.baseURL = baseURL;
  }

  async transcribe(audioPath: string, options: {
    language?: string;
    task?: 'transcribe' | 'translate';
  } = {}) {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(audioPath));

    const params = new URLSearchParams();
    if (options.language) params.append('language', options.language);
    if (options.task) params.append('task', options.task);

    const response = await axios.post(
      `${this.baseURL}/api/stt/transcribe?${params.toString()}`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    return response.data;
  }
}

// Usage
const stt = new STTClient();
const result = await stt.transcribe('audio.wav', { language: 'en' });
console.log(result.data.text);
```

---

## Python Integration

### Basic Integration

```python
import requests
from typing import Optional, Dict, Any

class STTClient:
    def __init__(self, base_url: str = "http://localhost:11210"):
        self.base_url = base_url
    
    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = "en",
        task: Optional[str] = "transcribe",
        **kwargs
    ) -> Dict[str, Any]:
        """Transcribe audio file"""
        with open(audio_path, "rb") as f:
            files = {"audio": f}
            params = {"language": language, "task": task, **kwargs}
            response = requests.post(
                f"{self.base_url}/api/stt/transcribe",
                files=files,
                params=params
            )
            response.raise_for_status()
            return response.json()

# Usage
stt = STTClient()
result = stt.transcribe("audio.wav", language="en")
print(result["data"]["text"])
```

---

## Microservice Architecture

### Service Discovery

```typescript
// Service discovery pattern
class ServiceRegistry {
  private services: Map<string, string> = new Map();

  register(name: string, url: string) {
    this.services.set(name, url);
  }

  get(name: string): string | undefined {
    return this.services.get(name);
  }

  async healthCheck(name: string): Promise<boolean> {
    const url = this.get(name);
    if (!url) return false;

    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Usage
const registry = new ServiceRegistry();
registry.register('stt', 'http://localhost:11210');

const isHealthy = await registry.healthCheck('stt');
```

---

## Error Handling

### Retry Logic

```typescript
async function transcribeWithRetry(
  audio: Buffer,
  maxRetries = 3,
  retryDelay = 1000
): Promise<STTResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sttService.transcribe({ audio });
      if (result.success) {
        return result;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

---

## See Also

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [API Examples](./API_EXAMPLES.md) - Code examples
- [English Tutor Integration](./ENGLISH_TUTOR_INTEGRATION.md) - Detailed integration guide

