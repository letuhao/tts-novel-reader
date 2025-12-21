# AI Models Integration Guide

This document details how various AI models will be integrated into the English Tutor App, with Ollama serving as the central orchestration brain.

## 🧠 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              English Tutor Application                  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Ollama     │  │  Coqui TTS   │  │ Whisper STT  │ │
│  │ (Main Brain) │  │   (Speech)   │  │  (Speech)    │ │
│  │              │  │              │  │              │ │
│  │ Orchestrates │  │ Text → Audio │  │ Audio → Text │ │
│  │ All Learning │  │              │  │              │ │
│  │  Activities  │  │              │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                            │
│                   ┌────────▼────────┐                   │
│                   │  Backend API    │                   │
│                   │  (Orchestrator) │                   │
│                   └────────┬────────┘                   │
└────────────────────────────┼────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Frontend UI   │
                    │  (User Interface)│
                    └─────────────────┘
```

## 1. Ollama (Main Brain) 🎯

### Purpose
Ollama serves as the central reasoning engine, handling all intelligent interactions with students.

### Key Responsibilities

1. **Conversational AI**
   - Natural dialogue with students
   - Context-aware conversations
   - Multi-turn dialogue management

2. **Grammar Analysis & Correction**
   - Identify grammatical errors
   - Explain grammar rules
   - Suggest corrections

3. **Content Generation**
   - Create personalized exercises
   - Generate explanations
   - Create practice scenarios

4. **Adaptive Learning**
   - Analyze student performance
   - Adjust difficulty level
   - Recommend next topics

5. **Feedback Generation**
   - Provide detailed feedback
   - Encourage student progress
   - Highlight strengths and weaknesses

### Recommended Models

| Model | Size | Best For | Speed | Quality |
|-------|------|----------|-------|---------|
| `llama3.1:8b` | 8B | General conversation, fast responses | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| `llama3.1:70b` | 70B | Complex reasoning, advanced grammar | ⚡ | ⭐⭐⭐⭐⭐ |
| `mistral:7b` | 7B | Real-time interactions | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ |
| `qwen2.5:7b` | 7B | Multilingual support | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| `gemma2:9b` | 9B | Educational content | ⚡⚡⚡ | ⭐⭐⭐⭐ |

**Recommendation:** Start with `llama3.1:8b` for speed, use `llama3.1:70b` for complex tasks.

### Integration Approach

#### API Endpoints

```javascript
// Ollama Service Wrapper
class OllamaService {
  constructor(baseURL = 'http://localhost:11434', model = 'llama3.1:8b') {
    this.baseURL = baseURL;
    this.model = model;
  }

  // Generate conversation response
  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        stream: options.stream || false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
        }
      })
    });
    return response.json();
  }

  // Generate structured JSON response
  async generateJSON(prompt, schema) {
    const systemPrompt = `You are an English tutor. 
      Respond in valid JSON format following this schema: ${JSON.stringify(schema)}`;
    
    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]);
    
    return JSON.parse(response.message.content);
  }

  // Grammar analysis
  async analyzeGrammar(text) {
    const prompt = `Analyze the following English text for grammatical errors. 
      Provide corrections and explanations.
      Text: "${text}"`;
    
    return this.generateJSON(prompt, {
      errors: [{ type: 'string', position: 'number', correction: 'string', explanation: 'string' }],
      overall_score: 'number',
      feedback: 'string'
    });
  }
}
```

#### Use Cases

1. **Conversation Practice**
   ```javascript
   // Student speaks → Whisper transcribes → Ollama responds → Coqui speaks
   const conversation = async (studentText) => {
     const messages = [
       { role: 'system', content: 'You are a friendly English tutor...' },
       { role: 'user', content: studentText }
     ];
     const response = await ollamaService.chat(messages);
     return response.message.content;
   };
   ```

2. **Grammar Correction**
   ```javascript
   const correctGrammar = async (text) => {
     return await ollamaService.analyzeGrammar(text);
   };
   ```

3. **Exercise Generation**
   ```javascript
   const generateExercise = async (topic, level) => {
     const prompt = `Generate a ${level} level exercise about ${topic}`;
     return await ollamaService.generateJSON(prompt, exerciseSchema);
   };
   ```

### Configuration

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.1:8b
OLLAMA_ADVANCED_MODEL=llama3.1:70b
OLLAMA_TIMEOUT=60000
```

## 2. Coqui AI TTS (Text-to-Speech) 🔊

### Purpose
Convert text content to natural, high-quality English speech.

### Current Status
✅ Already integrated in the codebase

### Integration Details

**Existing Implementation:**
- FastAPI backend service
- Multiple voice options
- Speed control
- Audio caching

### Usage in English Tutor

#### Voice Selection
- **Tutor Voice:** Professional, clear (male/female options)
- **Example Voice:** Different voice for examples
- **Accent Options:** British, American, Australian

#### Use Cases

1. **Read Lesson Content**
   ```javascript
   const readLesson = async (text) => {
     return await ttsService.synthesize({
       text: text,
       voice: 'tutor_female',
       speed: 0.9, // Slightly slower for clarity
       store: true
     });
   };
   ```

2. **Pronunciation Examples**
   ```javascript
   const pronounceWord = async (word, phonetic) => {
     const text = `The word "${word}" is pronounced: ${phonetic}`;
     return await ttsService.synthesize({
       text: text,
       voice: 'tutor_female',
       speed: 0.8 // Slow for pronunciation practice
     });
   };
   ```

3. **Exercise Instructions**
   ```javascript
   const readInstructions = async (instructions) => {
     return await ttsService.synthesize({
       text: instructions,
       voice: 'tutor_male',
       speed: 1.0
     });
   };
   ```

### Configuration

```env
TTS_BACKEND_URL=http://localhost:11111
TTS_DEFAULT_VOICE=tutor_female
TTS_DEFAULT_SPEED=0.9
TTS_CACHE_ENABLED=true
```

### Future Enhancements
- Emotion control (enthusiasm, encouragement)
- Emphasis on keywords
- Pause control for comprehension
- Multiple speaker dialogues

## 3. Whisper STT (Speech-to-Text) 🎤

### Purpose
Convert student speech to text for analysis and assessment.

### Status
⏳ To be implemented

### Recommended Implementation

#### Option 1: OpenAI Whisper (Recommended)
- **Model:** `whisper-large-v3` (best accuracy) or `whisper-medium` (faster)
- **Library:** `faster-whisper` (faster inference)
- **Language:** English (can be multilingual)

#### Option 2: OpenAI Whisper API
- Cloud-based
- Requires API key
- More expensive but easier to implement

#### Implementation Approach

**Backend Service (Python/FastAPI)**

```python
# stt_backend/service.py
from faster_whisper import WhisperModel
import torch

class STTService:
    def __init__(self, model_size="medium", device="cuda"):
        self.model = WhisperModel(
            model_size, 
            device=device,
            compute_type="float16" if device == "cuda" else "int8"
        )
    
    def transcribe(self, audio_path, language="en"):
        """Transcribe audio file to text"""
        segments, info = self.model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            vad_filter=True  # Voice activity detection
        )
        
        text = " ".join([segment.text for segment in segments])
        return {
            "text": text,
            "language": info.language,
            "confidence": info.language_probability,
            "segments": [
                {
                    "text": seg.text,
                    "start": seg.start,
                    "end": seg.end,
                    "confidence": seg.no_speech_prob
                }
                for seg in segments
            ]
        }
    
    def transcribe_streaming(self, audio_stream, language="en"):
        """Real-time transcription from audio stream"""
        # Implementation for streaming
        pass
```

**API Endpoints**

```python
# stt_backend/api.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
stt_service = STTService()

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = "en"):
    # Save uploaded audio
    audio_path = f"/tmp/{audio.filename}"
    with open(audio_path, "wb") as f:
        f.write(await audio.read())
    
    # Transcribe
    result = stt_service.transcribe(audio_path, language)
    return result

@app.post("/transcribe/streaming")
async def transcribe_streaming(audio_stream):
    # Real-time streaming transcription
    pass
```

**Frontend Integration**

```javascript
// sttService.js
class STTService {
  constructor(apiUrl = 'http://localhost:11112') {
    this.apiUrl = apiUrl;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };
    
    this.mediaRecorder.start();
  }

  async stopRecording() {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const transcription = await this.transcribe(audioBlob);
        this.audioChunks = [];
        resolve(transcription);
      };
      this.mediaRecorder.stop();
    });
  }

  async transcribe(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    const response = await fetch(`${this.apiUrl}/transcribe`, {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
}
```

### Use Cases

1. **Pronunciation Practice**
   ```javascript
   // Student speaks → Whisper transcribes → Compare with expected text
   const practicePronunciation = async (expectedText) => {
     const stt = new STTService();
     await stt.startRecording();
     // ... wait for student to speak
     const result = await stt.stopRecording();
     return {
       spoken: result.text,
       expected: expectedText,
       match: compareText(result.text, expectedText)
     };
   };
   ```

2. **Conversation Transcription**
   ```javascript
   // Transcribe student speech for Ollama to process
   const transcribeForConversation = async (audioBlob) => {
     const result = await sttService.transcribe(audioBlob);
     return result.text;
   };
   ```

3. **Dictation Exercises**
   ```javascript
   // Student listens to audio → Types or speaks answer → Check accuracy
   const dictationExercise = async (expectedText) => {
     const result = await sttService.stopRecording();
     const accuracy = calculateAccuracy(result.text, expectedText);
     return { transcription: result.text, accuracy };
   };
   ```

### Configuration

```env
STT_BACKEND_URL=http://localhost:11112
STT_MODEL_SIZE=medium
STT_DEVICE=cuda
STT_LANGUAGE=en
```

## 4. Integration Flow Examples

### Example 1: Conversation Practice

```
1. Student speaks → Microphone captures audio
2. Audio → Whisper STT → Text: "I want to learn English"
3. Text → Ollama → Response: "That's great! What would you like to learn today?"
4. Response → Coqui TTS → Audio
5. Audio → Frontend → Plays to student
```

### Example 2: Grammar Correction

```
1. Student types: "I goed to school"
2. Text → Ollama (grammar analysis)
3. Ollama → Response: {
     errors: [{ type: "verb", correction: "went", explanation: "..." }],
     corrected: "I went to school"
   }
4. Response → Frontend → Displays correction
5. Correction → Coqui TTS → Audio explanation
```

### Example 3: Pronunciation Practice

```
1. Coqui TTS → Plays word: "pronunciation"
2. Student speaks → Whisper STT → Transcribes
3. Transcription → Ollama → Compares with expected
4. Ollama → Feedback: "Good! Try emphasizing the second syllable more"
5. Feedback → Coqui TTS → Audio feedback
```

## 5. Additional AI Models (Future)

### Grammar Correction Models
- **jhu-clsp/bernice** - Specialized grammar error correction
- Integration via Hugging Face Transformers
- Real-time error detection and correction

### Pronunciation Assessment
- Phonetic analysis models
- Compare student pronunciation to native patterns
- Phoneme-level feedback

### Sentiment Analysis
- Detect student emotions (frustration, confidence)
- Adjust teaching approach
- Provide encouragement

### Learning Analytics
- Predict learning outcomes
- Identify struggling areas
- Recommend personalized learning paths

## 6. Performance Considerations

### Model Loading
- **Preload:** Load models at startup
- **Lazy Loading:** Load models on demand
- **Model Pooling:** Keep frequently used models in memory

### Response Times
- **Ollama:** 1-5 seconds (depending on model size)
- **Coqui TTS:** 0.5-2 seconds (depending on text length)
- **Whisper STT:** 0.5-3 seconds (depending on audio length)

### Caching Strategy
- Cache common TTS outputs
- Cache frequent Ollama responses (with context awareness)
- Cache transcription results for repeated audio

### Optimization
- Use smaller models for real-time tasks
- Use larger models for complex analysis
- Batch processing where possible
- GPU acceleration for all models

## 7. Testing Strategy

### Unit Tests
- Individual service tests
- Mock responses for development
- Error handling tests

### Integration Tests
- Full flow tests (STT → Ollama → TTS)
- Performance benchmarks
- Accuracy measurements

### User Testing
- Real conversation flows
- Pronunciation accuracy
- Grammar correction effectiveness

---

**Next Steps:**
1. Implement Whisper STT backend
2. Create Ollama service wrapper
3. Build integration layer
4. Test end-to-end flows
5. Optimize performance

