# English Tutor App - Overview

## 🎯 Vision

An intelligent, AI-powered English learning application that provides personalized, interactive English tutoring using multiple AI models working in harmony. The app will leverage Ollama as the central reasoning engine, with specialized AI models for speech-to-text, text-to-speech, and other learning-specific tasks.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                │
│  - Interactive UI                                           │
│  - Real-time audio/video                                    │
│  - Progress tracking                                        │
│  - Curriculum navigation                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                  Backend API (Node.js/FastAPI)              │
│  - Session management                                       │
│  - Curriculum service                                       │
│  - Progress tracking                                        │
│  - User analytics                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼────────┐
│    Ollama    │ │  Coqui TTS  │ │ Whisper STT  │
│  (Main Brain)│ │  (Speech)   │ │  (Speech)    │
│              │ │             │ │              │
│ - Dialogue   │ │ - TTS       │ │ - STT        │
│ - Grammar    │ │ - Voice     │ │ - Diarization│
│ - Feedback   │ │   synthesis │ │ - Language   │
│ - Exercises  │ │             │ │   detection  │
│ - Assessment │ │             │ │              │
└──────────────┘ └─────────────┘ └──────────────┘
        │
┌───────▼───────────────────────────────────────┐
│         Additional AI Models (Future)         │
│  - Grammar correction models                  │
│  - Pronunciation assessment                   │
│  - Sentiment analysis                         │
│  - Learning style adaptation                  │
└───────────────────────────────────────────────┘
```

## 🧠 Core AI Components

### 1. Ollama (Main Brain) 🎯

**Role:** Central reasoning and orchestration engine

**Responsibilities:**
- **Conversational AI:** Natural dialogue with students
- **Grammar Analysis:** Identify and explain grammatical errors
- **Content Generation:** Create personalized exercises and explanations
- **Adaptive Learning:** Adjust difficulty based on student progress
- **Feedback Generation:** Provide detailed, constructive feedback
- **Question Answering:** Answer student questions about English
- **Curriculum Guidance:** Guide students through learning paths

**Recommended Models:**
- `llama3.1:8b` or `llama3.1:70b` - General reasoning, conversation
- `mistral:7b` - Fast responses, good for real-time interaction
- `qwen2.5:7b` - Excellent multilingual support
- `gemma2:9b` - Strong for educational content

**Integration Points:**
- REST API via Ollama's HTTP API (port 11434)
- WebSocket for streaming responses
- JSON mode for structured responses

### 2. Coqui AI TTS (Text-to-Speech) 🔊

**Role:** Natural English speech synthesis

**Current Status:** Already integrated in the codebase

**Responsibilities:**
- Convert lesson content to natural speech
- Provide pronunciation examples
- Read exercises and instructions aloud
- Generate audio for listening comprehension
- Multiple voice options (male/female, accents)

**Features to Leverage:**
- High-quality neural TTS
- Multiple voice options
- Speed control (already implemented)
- Emotion and emphasis control
- Real-time synthesis

**Integration:**
- Existing TTS backend service
- FastAPI endpoint for audio generation
- Caching for frequently used content

### 3. Whisper AI STT (Speech-to-Text) 🎤

**Role:** Convert student speech to text

**Status:** To be implemented

**Responsibilities:**
- Transcribe student speech for pronunciation practice
- Convert spoken answers to text for assessment
- Real-time transcription during conversations
- Language detection
- Speaker diarization (if multiple speakers)

**Recommended Implementation:**
- OpenAI Whisper (open-source)
- Models: `whisper-large-v3` (best accuracy) or `whisper-medium` (faster)
- Real-time streaming with faster-whisper
- On-device processing for privacy

**Features:**
- Multi-language support
- Punctuation and capitalization
- Timestamps for audio alignment
- Confidence scores

### 4. Additional AI Models (Future) 🔮

**Grammar Correction:**
- `jhu-clsp/bernice` - Grammatical error correction
- Fine-tuned BERT models for grammar checking
- Real-time error highlighting

**Pronunciation Assessment:**
- Phonetic analysis models
- Compare student pronunciation to native patterns
- Provide detailed feedback on phonemes

**Sentiment Analysis:**
- Detect student frustration or confusion
- Adjust lesson difficulty accordingly
- Provide encouragement

**Learning Style Adaptation:**
- Analyze student responses and learning patterns
- Adapt teaching style (visual, auditory, kinesthetic)
- Personalized content recommendations

## 📚 English Curriculum Design

### Curriculum Structure

The curriculum should be comprehensive, progressive, and aligned with CEFR (Common European Framework of Reference) levels:

```
Levels:
├── A1 (Beginner)
│   ├── Basic vocabulary (500 words)
│   ├── Present simple tense
│   ├── Basic greetings and introductions
│   ├── Numbers, colors, family
│   └── Simple conversations
│
├── A2 (Elementary)
│   ├── Expanded vocabulary (1000 words)
│   ├── Past and future tenses
│   ├── Daily routines and activities
│   ├── Shopping and directions
│   └── Basic writing skills
│
├── B1 (Intermediate)
│   ├── Vocabulary (2000 words)
│   ├── Complex tenses and conditionals
│   ├── Work and professional topics
│   ├── Opinion expression
│   └── Storytelling
│
├── B2 (Upper-Intermediate)
│   ├── Advanced vocabulary (4000 words)
│   ├── Subjunctive and advanced grammar
│   ├── Academic topics
│   ├── Debates and discussions
│   └── Essay writing
│
├── C1 (Advanced)
│   ├── Nuanced vocabulary (8000 words)
│   ├── Idiomatic expressions
│   ├── Complex texts and analysis
│   ├── Professional communication
│   └── Creative writing
│
└── C2 (Proficient)
    ├── Native-like vocabulary
    ├── Subtle nuances and cultural context
    ├── Academic and professional mastery
    ├── Literature and poetry
    └── Translation and interpretation
```

### Curriculum Components

#### 1. **Vocabulary Building**
- Thematic word lists
- Spaced repetition system
- Context-based learning
- Visual associations
- Audio pronunciation practice

#### 2. **Grammar Lessons**
- Progressive introduction of rules
- Interactive exercises
- Error correction practice
- Usage examples from real contexts
- Comparison with native language

#### 3. **Speaking Practice**
- Pronunciation drills
- Conversation simulations
- Role-playing scenarios
- Discussion topics
- Presentation practice

#### 4. **Listening Comprehension**
- Audio/video lessons
- Dictation exercises
- Accent variety (British, American, etc.)
- Speed variations
- Real-world audio samples

#### 5. **Reading Comprehension**
- Graded reading materials
- Comprehension questions
- Vocabulary in context
- Literary analysis (advanced levels)
- News articles and blogs

#### 6. **Writing Practice**
- Sentence construction
- Paragraph writing
- Essay writing
- Creative writing
- Professional writing (emails, reports)

#### 7. **Interactive Exercises**
- Fill-in-the-blanks
- Multiple choice
- Matching exercises
- Sentence rearrangement
- Error correction
- Translation practice

### Curriculum Content Sources

1. **CEFR-aligned materials** - Official frameworks and resources
2. **Textbooks** - Popular ESL textbooks (Cambridge, Oxford, etc.)
3. **Real-world content** - News articles, podcasts, videos
4. **AI-generated content** - Ollama-generated exercises tailored to students
5. **Community contributions** - Teacher-created content
6. **Adaptive content** - Generated based on student needs

### Assessment System

- **Placement Test:** Initial level assessment
- **Progress Tests:** Regular checkpoints
- **Skills Assessment:** Separate scores for listening, speaking, reading, writing
- **Adaptive Testing:** Adjusts difficulty based on performance
- **Certification:** Optional CEFR-aligned certificates

## 🎓 Learning Features

### 1. Personalized Learning Path
- Initial assessment determines starting level
- Adaptive curriculum adjusts to progress
- Focus on weak areas
- Accelerate through mastered topics

### 2. Interactive Conversations
- Real-time dialogue with Ollama
- Natural conversation practice
- Error correction and feedback
- Topic-based discussions

### 3. Pronunciation Training
- Whisper STT analyzes pronunciation
- Compare with native speaker patterns
- Phoneme-level feedback
- Practice exercises with audio

### 4. Grammar Assistant
- Real-time grammar checking
- Detailed explanations
- Examples and corrections
- Practice exercises

### 5. Vocabulary Builder
- Spaced repetition algorithm
- Contextual learning
- Flashcards with audio
- Progress tracking

### 6. Progress Tracking
- Visual progress dashboards
- Skill-level breakdowns
- Time spent tracking
- Achievement badges
- Performance analytics

### 7. Gamification
- Points and levels
- Streaks and daily goals
- Challenges and competitions
- Achievements and rewards

## 🔧 Technical Implementation

### Backend Architecture

**Services:**
- **API Gateway** - Main backend (Node.js/Express or FastAPI)
- **Ollama Service** - Wrapper for Ollama API
- **TTS Service** - Coqui AI integration (existing)
- **STT Service** - Whisper integration (to be built)
- **Curriculum Service** - Content management
- **Progress Service** - User progress tracking
- **Analytics Service** - Learning analytics

**Database:**
- User data and progress
- Curriculum content
- Exercise results
- Audio/video storage metadata
- Conversation history

### Frontend Architecture

- **React/Next.js** - Modern UI framework
- **Real-time audio** - Web Audio API, MediaRecorder
- **State management** - Zustand/Redux
- **UI components** - Tailwind CSS + shadcn/ui
- **Audio visualization** - Waveform display
- **Video player** - For listening exercises

### Integration Flow

```
User speaks → Whisper STT → Text
                            ↓
Text → Ollama (analyze) → Feedback/Response
                            ↓
Response → Coqui TTS → Audio
                            ↓
Audio → Frontend → Play to user
```

## 🚀 Development Phases

### Phase 1: Foundation (Current)
- ✅ Coqui TTS integration
- ⏳ Project structure setup
- ⏳ Basic UI framework

### Phase 2: Core AI Integration
- Ollama integration and testing
- Whisper STT implementation
- Basic conversation flow

### Phase 3: Curriculum System
- Curriculum database design
- Content management system
- Level progression logic

### Phase 4: Learning Features
- Exercise system
- Progress tracking
- Assessment tools

### Phase 5: Advanced Features
- Pronunciation assessment
- Grammar correction
- Adaptive learning algorithms

### Phase 6: Polish & Launch
- UI/UX improvements
- Performance optimization
- Testing and bug fixes
- Documentation

## 📊 Success Metrics

- **Learning Effectiveness:** Improvement in student test scores
- **Engagement:** Daily active users, session length
- **Completion Rates:** Course completion percentages
- **User Satisfaction:** Ratings and feedback
- **Pronunciation Improvement:** Measured improvement over time
- **Vocabulary Growth:** Words learned per student

## 🎯 Next Steps

1. **Review and refine this overview** - Get feedback and adjust
2. **Set up project structure** - Create directory structure
3. **Design database schema** - User, curriculum, progress tables
4. **Prototype Ollama integration** - Basic conversation flow
5. **Design curriculum structure** - Detailed lesson plans
6. **Plan Whisper STT implementation** - Research best approach

---

**Last Updated:** [Current Date]
**Status:** Planning Phase

