# Frontend Design Document
# Tài liệu Thiết kế Frontend

## 🎯 Overview / Tổng quan

Design document for the Novel Reader React frontend application.
Tài liệu thiết kế cho ứng dụng React Frontend Đọc Truyện.

## 📋 Table of Contents / Mục lục

1. [Features & User Stories](#features--user-stories)
2. [User Flows & Business Pipelines](#user-flows--business-pipelines)
3. [UI/UX Design](#uiux-design)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## 🎨 Features & User Stories / Tính năng & Câu chuyện Người dùng

### Core Features / Tính năng Cốt lõi

#### 1. Novel Library / Thư viện Truyện

**User Story:**
- As a user, I want to see all my novels in a library view
- As a user, I want to upload a new novel file
- As a user, I want to see novel metadata (title, chapters, progress)
- As a user, I want to filter/search novels

**Features:**
- 📚 List all novels with thumbnails/metadata
- ➕ Upload novel file (drag & drop or file picker)
- 📊 Display novel statistics (total chapters, reading progress)
- 🔍 Search/filter novels by title
- 📖 Quick access to reading view

#### 2. Novel Reader / Đọc Truyện

**User Story:**
- As a user, I want to read/listen to a novel
- As a user, I want to see the text while audio plays
- As a user, I want to navigate between chapters
- As a user, I want to jump to a specific chapter

**Features:**
- 📄 Display chapter text with paragraphs
- 🎵 Audio player with playback controls
- 📑 Chapter navigation (previous/next)
- 🔢 Chapter selector/dropdown
- 📍 Current position indicator
- 📝 Text sync highlight (highlight current paragraph being read)

#### 3. Audio Player / Trình Phát Audio

**User Story:**
- As a user, I want to play/pause audio
- As a user, I want to control playback speed
- As a user, I want to see current position and duration
- As a user, I want to seek to a specific position

**Features:**
- ⏯️ Play/Pause controls
- ⏩⏪ Previous/Next paragraph buttons
- 🎚️ Playback speed control (0.5x - 2.0x)
- 📊 Progress bar with seeking
- ⏱️ Current time / Total duration display
- 🔊 Volume control
- 🔁 Continuous playback (auto-play next paragraph/chapter)

#### 4. Progress Tracking / Theo dõi Tiến độ

**User Story:**
- As a user, I want my reading progress to be saved automatically
- As a user, I want to resume where I left off
- As a user, I want to see my reading statistics

**Features:**
- 💾 Auto-save progress (current chapter, paragraph, position)
- 🔄 Resume reading from last position
- 📈 Progress bar per chapter/novel
- ⏱️ Reading time tracking
- 📊 Completion percentage

#### 5. Audio Generation / Tạo Audio

**User Story:**
- As a user, I want audio to be generated automatically when needed
- As a user, I want to see generation progress
- As a user, I want to pre-generate audio for chapters

**Features:**
- ⚡ On-demand audio generation (lazy loading)
- 📊 Generation progress indicator
- 🔄 Pre-generation option for chapters
- ⏳ Loading states and progress feedback

### Enhanced Features / Tính năng Nâng cao

#### 6. Playlist / Danh sách Phát

**User Story:**
- As a user, I want to queue multiple chapters for continuous playback
- As a user, I want to reorder chapters in the playlist

**Features:**
- 📋 Chapter queue/playlist
- 🔀 Drag & drop reordering
- ➕ Add/remove chapters from playlist
- 🔁 Shuffle/repeat options

#### 7. Bookmarks / Đánh dấu

**User Story:**
- As a user, I want to bookmark favorite positions
- As a user, I want to quickly jump to bookmarks

**Features:**
- 🔖 Bookmark current position
- 📑 List of bookmarks
- 🚀 Quick jump to bookmark
- 🏷️ Bookmark labels/notes

#### 8. Reading Statistics / Thống kê Đọc

**User Story:**
- As a user, I want to see my reading statistics
- As a user, I want to track reading time per novel

**Features:**
- 📊 Total reading time
- 📈 Progress charts
- 📚 Novels completed count
- ⏱️ Reading streaks

#### 9. Settings / Cài đặt

**User Story:**
- As a user, I want to customize playback settings
- As a user, I want to change theme (dark/light mode)

**Features:**
- 🎚️ Default playback speed
- 🎨 Theme selection (dark/light)
- 🔊 Default volume
- ⚙️ Auto-play settings
- 📱 UI preferences

---

## 🔄 User Flows & Business Pipelines / Luồng Người dùng & Pipeline Nghiệp vụ

### Flow 1: Upload & Process Novel / Tải lên & Xử lý Truyện

```
User Action
    │
    ├─► Upload Novel File
    │   └─► [Drag & Drop or File Picker]
    │
    ├─► Backend Processing
    │   ├─► POST /api/novels/upload
    │   ├─► Parse novel file
    │   ├─► Extract chapters/paragraphs
    │   ├─► Store in database (normalized)
    │   └─► Return novel metadata
    │
    ├─► Frontend Updates
    │   ├─► Show processing status
    │   ├─► Display novel in library
    │   └─► Update novel list
    │
    └─► Ready for Reading
```

### Flow 2: Start Reading / Bắt đầu Đọc

```
User Action
    │
    ├─► Select Novel from Library
    │   └─► GET /api/novels/:id
    │
    ├─► Load Novel Data
    │   ├─► Novel metadata
    │   ├─► Chapter list
    │   └─► Last reading progress (if exists)
    │       └─► GET /api/progress/:novelId
    │
    ├─► Navigate to Reader View
    │   ├─► Load chapter content
    │   │   └─► GET /api/novels/:id/chapters/:chapterNumber
    │   └─► Check audio availability
    │       └─► GET /api/audio/:novelId/:chapterNumber
    │
    └─► Display Reader UI
        ├─► Chapter text
        ├─► Audio player
        └─► Navigation controls
```

### Flow 3: Play Audio / Phát Audio

```
User Action
    │
    ├─► Click Play Button
    │   │
    │   ├─► Check if audio exists
    │   │   ├─► YES: Load audio file
    │   │   │   └─► GET /api/audio/:novelId/:chapterNumber
    │   │   │       └─► Return paragraph audio URLs
    │   │   │
    │   │   └─► NO: Generate audio on-demand
    │   │       ├─► POST /api/worker/generate/chapter
    │   │       ├─► Show generation progress
    │   │       │   └─► GET /api/generation/novel/:id/chapter/:number/stats
    │   │       ├─► Wait for generation
    │   │       └─► Load generated audio
    │   │
    │   └─► Start Playback
    │       ├─► Load first paragraph audio
    │       ├─► Play audio
    │       ├─► Update UI (progress, current paragraph highlight)
    │       └─► Auto-advance to next paragraph
    │
    ├─► During Playback
    │   ├─► Update progress bar
    │   ├─► Highlight current paragraph
    │   ├─► Auto-save progress
    │   │   └─► POST /api/progress/save
    │   └─► Preload next paragraph audio
    │
    └─► Audio Completion
        ├─► Move to next paragraph
        ├─► If last paragraph: move to next chapter
        └─► Update progress
```

### Flow 4: Navigate Chapters / Điều hướng Chương

```
User Action
    │
    ├─► User Clicks "Next Chapter"
    │   │
    │   ├─► Stop current playback
    │   ├─► Save current progress
    │   ├─► Load next chapter
    │   │   └─► GET /api/novels/:id/chapters/:nextChapterNumber
    │   ├─► Check audio availability
    │   │   └─► GET /api/audio/:novelId/:nextChapterNumber
    │   └─► Display new chapter
    │       ├─► Chapter text
    │       └─► Audio player (ready/not ready)
    │
    └─► OR: User Selects Chapter from Dropdown
        └─► Same flow as above
```

### Flow 5: Save Progress / Lưu Tiến độ

```
Automatic Progress Saving
    │
    ├─► Trigger Events
    │   ├─► Audio position changes (every 5 seconds)
    │   ├─► User pauses playback
    │   ├─► User navigates away
    │   └─► Chapter/paragraph changes
    │
    ├─► Collect Progress Data
    │   ├─► Novel ID
    │   ├─► Current chapter number
    │   ├─► Current paragraph number
    │   ├─► Audio position (seconds)
    │   └─► Timestamp
    │
    ├─► Save to Backend
    │   └─► POST /api/progress/save
    │       └─► Store in database
    │
    └─► Update UI
        └─► Update progress indicators
```

### Flow 6: Pre-generate Audio / Tạo Audio Trước

```
User Action (Optional)
    │
    ├─► User Selects "Pre-generate Chapter Audio"
    │   │
    │   ├─► Show Generation Options
    │   │   ├─► Select chapters
    │   │   ├─► Speaker ID selection
    │   │   └─► Speed factor
    │   │
    │   ├─► Start Generation
    │   │   └─► POST /api/worker/generate/chapter
    │   │       └─► Worker processes in background
    │   │
    │   ├─► Show Progress
    │   │   ├─► Real-time progress updates
    │   │   │   └─► GET /api/generation/novel/:id/chapter/:number/stats
    │   │   ├─► Completed/failed count
    │   │   └─► Progress bar
    │   │
    │   └─► Completion
    │       └─► Update UI (audio available indicator)
    │
    └─► OR: Automatic Pre-generation (Future)
        └─► Worker pre-generates next chapter while playing current
```

---

## 🎨 UI/UX Design / Thiết kế Giao diện

### Layout Structure / Cấu trúc Layout

```
┌─────────────────────────────────────────────────────────┐
│                     Header / Navbar                       │
│  [Logo] [Novels] [Reader] [Settings] [Theme Toggle]     │
└─────────────────────────────────────────────────────────┘
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                     │  │
│  │              Main Content Area                      │  │
│  │                                                     │  │
│  │  (Library View / Reader View / Settings)           │  │
│  │                                                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Audio Player (Fixed Bottom)             │  │
│  │  [⏮] [⏯] [⏭]  [════════●════]  [⏱] [🎚] [🔊]   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Screen 1: Library View / Màn hình Thư viện

```
┌─────────────────────────────────────────────────────────┐
│  📚 Novel Library                          [+ Upload]   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  🔍 [Search novels...]                                   │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Novel 1   │  │  Novel 2   │  │  Novel 3   │        │
│  │            │  │            │  │            │        │
│  │  Title     │  │  Title     │  │  Title     │        │
│  │  45 ch.    │  │  30 ch.    │  │  20 ch.    │        │
│  │  ████░░░░  │  │  ██████░░  │  │  ███░░░░░  │        │
│  │  40%       │  │  60%       │  │  30%       │        │
│  │  [Read]    │  │  [Read]    │  │  [Read]    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Screen 2: Reader View / Màn hình Đọc

```
┌─────────────────────────────────────────────────────────┐
│  ← Back  |  📖 Novel Title  |  Ch. [1 ▼]  |  🔖 Bookmark│
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Chapter 1: Chapter Title                         │  │
│  │                                                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │ Paragraph 1 text...                        │  │  │
│  │  │                                            │  │  │
│  │  │ ► Paragraph 2 text... (Currently Playing) │  │  │
│  │  │                                            │  │  │
│  │  │ Paragraph 3 text...                        │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  📍 Position: Paragraph 2 of 112                 │  │
│  │  ████████░░░░░░░░░░░ 8%                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Screen 3: Audio Player / Trình Phát Audio

```
┌─────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────┐  │
│  │  Chapter 1: Chapter Title                         │  │
│  │  Paragraph 2 of 112                               │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  [⏮ Prev]  [⏯ Pause]  [⏭ Next]                 │  │
│  │                                                    │  │
│  │  ──────────●────────────── 02:15 / 05:30         │  │
│  │                                                    │  │
│  │  Speed: [0.5x] [0.75x] [1.0x] [1.25x] [1.5x] [2x]│  │
│  │  Volume: ──────────●─── 🔊                         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Component Architecture / Kiến trúc Component

### Component Hierarchy / Hệ thống phân cấp Component

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── ThemeToggle
│   ├── MainContent
│   │   ├── LibraryView (Route: /)
│   │   │   ├── NovelList
│   │   │   │   └── NovelCard
│   │   │   ├── NovelUpload
│   │   │   └── SearchBar
│   │   │
│   │   ├── ReaderView (Route: /novel/:id)
│   │   │   ├── ReaderHeader
│   │   │   │   ├── ChapterNavigation
│   │   │   │   ├── ChapterSelector
│   │   │   │   └── BookmarkButton
│   │   │   ├── ChapterContent
│   │   │   │   └── ParagraphList
│   │   │   │       └── Paragraph
│   │   │   ├── ProgressIndicator
│   │   │   └── GenerationProgress (if generating)
│   │   │
│   │   └── SettingsView (Route: /settings)
│   │       ├── PlaybackSettings
│   │       ├── ThemeSettings
│   │       └── Statistics
│   │
│   └── AudioPlayer (Fixed/Floating)
│       ├── PlaybackControls
│       ├── ProgressBar
│       ├── TimeDisplay
│       ├── SpeedControl
│       └── VolumeControl
│
└── Providers
    ├── AudioProvider
    ├── NovelProvider
    ├── ProgressProvider
    └── ThemeProvider
```

### Core Components / Component Cốt lõi

#### 1. AudioPlayer Component

```javascript
<AudioPlayer>
  Props:
    - audioFiles: Array<{paragraphNumber, audioURL}>
    - currentParagraph: number
    - onParagraphChange: (paragraphNumber) => void
    - onProgressChange: (position, paragraph) => void
  
  State:
    - isPlaying: boolean
    - currentTime: number
    - duration: number
    - playbackRate: number (0.5 - 2.0)
    - volume: number (0 - 1)
  
  Features:
    - Play/pause current paragraph
    - Auto-advance to next paragraph
    - Seek within paragraph
    - Adjust playback speed
    - Volume control
    - Progress tracking
</AudioPlayer>
```

#### 2. ChapterContent Component

```javascript
<ChapterContent>
  Props:
    - novelId: string
    - chapterNumber: number
    - paragraphs: Array<Paragraph>
    - currentParagraphNumber: number
    - onParagraphClick: (paragraphNumber) => void
  
  State:
    - loadedParagraphs: Array<Paragraph>
    - highlightedParagraph: number
  
  Features:
    - Display chapter paragraphs
    - Highlight current paragraph (sync with audio)
    - Scroll to current paragraph
    - Click paragraph to jump audio
    - Lazy load paragraphs for long chapters
</ChapterContent>
```

#### 3. NovelCard Component

```javascript
<NovelCard>
  Props:
    - novel: Novel
    - onSelect: (novelId) => void
  
  Features:
    - Display novel title, metadata
    - Show progress indicator
    - Quick access to reader view
    - Delete novel option
    - Generation status indicator
</NovelCard>
```

---

## 🔄 State Management / Quản lý Trạng thái

### Global State Structure / Cấu trúc Trạng thái Toàn cục

```javascript
{
  // Novel State
  novels: {
    items: Array<Novel>,
    currentNovel: Novel | null,
    loading: boolean,
    error: string | null
  },
  
  // Reader State
  reader: {
    novelId: string | null,
    chapterNumber: number | null,
    paragraphs: Array<Paragraph>,
    currentParagraphNumber: number | null,
    chapterTitle: string | null
  },
  
  // Audio State
  audio: {
    isPlaying: boolean,
    currentTime: number,
    duration: number,
    playbackRate: number,
    volume: number,
    audioFiles: Array<AudioFile>,
    currentAudioIndex: number,
    isLoading: boolean
  },
  
  // Progress State
  progress: {
    currentNovelId: string | null,
    currentChapter: number | null,
    currentParagraph: number | null,
    audioPosition: number, // seconds
    lastSaved: Date | null
  },
  
  // Generation State
  generation: {
    novelId: string | null,
    chapterNumber: number | null,
    status: 'idle' | 'generating' | 'completed' | 'failed',
    progress: {
      total: number,
      completed: number,
      failed: number
    }
  },
  
  // UI State
  ui: {
    theme: 'light' | 'dark',
    sidebarOpen: boolean,
    currentView: 'library' | 'reader' | 'settings'
  }
}
```

### State Management Flow / Luồng Quản lý Trạng thái

```
User Action
    │
    ├─► Dispatch Action
    │   └─► State Store (Zustand/Redux)
    │
    ├─► State Update
    │   └─► UI Re-render
    │
    ├─► Side Effects
    │   ├─► API Calls
    │   ├─► Local Storage
    │   └─► Audio Control
    │
    └─► Feedback to User
        └─► Loading states, success/error messages
```

---

## 🔌 API Integration / Tích hợp API

### API Service Structure / Cấu trúc Dịch vụ API

```javascript
// API Base Configuration
const API_BASE_URL = 'http://localhost:11110/api';

// API Services
{
  novels: {
    getAll: () => GET /api/novels
    getById: (id) => GET /api/novels/:id
    upload: (file) => POST /api/novels/upload
    delete: (id) => DELETE /api/novels/:id
    getChapters: (id) => GET /api/novels/:id/chapters
    getChapter: (id, chapterNumber) => GET /api/novels/:id/chapters/:chapterNumber
  },
  
  audio: {
    getChapterAudio: (novelId, chapterNumber) => GET /api/audio/:novelId/:chapterNumber
    generateChapter: (novelId, chapterNumber, options) => POST /api/worker/generate/chapter
  },
  
  progress: {
    get: (novelId) => GET /api/progress/:novelId
    save: (progressData) => POST /api/progress/save
  },
  
  generation: {
    getChapterStats: (novelId, chapterNumber) => GET /api/generation/novel/:novelId/chapter/:chapterNumber/stats
    getProgress: (novelId, chapterNumber) => GET /api/generation/novel/:novelId/chapter/:chapterNumber
  }
}
```

### API Integration Flow / Luồng Tích hợp API

```
Component Mount / User Action
    │
    ├─► API Service Call
    │   └─► axios.get/post (with error handling)
    │
    ├─► Loading State
    │   └─► Update UI (loading spinner)
    │
    ├─► Success Response
    │   ├─► Update State Store
    │   ├─► Update UI
    │   └─► Cache response (if applicable)
    │
    └─► Error Response
        ├─► Show error message
        ├─► Update error state
        └─► Retry logic (if applicable)
```

---

## 📊 Data Flow Diagrams / Sơ đồ Luồng Dữ liệu

### Data Flow: Play Audio / Luồng Dữ liệu: Phát Audio

```
┌──────────┐
│   User   │
│  Clicks  │
│  Play    │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│ AudioPlayer     │
│ Component       │
│ - Check audio   │
│   availability  │
└────┬────────────┘
     │
     ├─► Audio Exists?
     │   │
     │   ├─► YES ──► ┌──────────────────┐
     │   │            │ Load Audio File  │
     │   │            │ from Cache/API   │
     │   │            └────────┬─────────┘
     │   │                     │
     │   └─► NO ────► ┌──────────────────┐
     │                 │ Generate Audio   │
     │                 │ POST /api/worker │
     │                 └────────┬─────────┘
     │                          │
     │                          ▼
     │                 ┌──────────────────┐
     │                 │ Poll Generation  │
     │                 │ Progress         │
     │                 └────────┬─────────┘
     │                          │
     └──────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Create Audio     │
                    │ Element & Play   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Update UI        │
                    │ - Play button    │
                    │ - Progress bar   │
                    │ - Time display   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Audio Events     │
                    │ - timeupdate     │
                    │ - ended          │
                    └────────┬─────────┘
                             │
                             ├─► timeupdate ──► Save Progress
                             │
                             └─► ended ───────► Next Paragraph
```

### Data Flow: Save Progress / Luồng Dữ liệu: Lưu Tiến độ

```
┌──────────┐
│ Audio    │
│ Events   │
│ (every   │
│ 5 sec)   │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│ Progress        │
│ Hook            │
│ - Collect       │
│   progress data │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Debounce        │
│ (5 seconds)     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ API Service     │
│ POST /api/      │
│ progress/save   │
└────┬────────────┘
     │
     ├─► Success ──► ┌──────────────────┐
     │                 │ Update State     │
     │                 │ lastSaved = now  │
     │                 └──────────────────┘
     │
     └─► Error ─────► ┌──────────────────┐
                       │ Queue for retry  │
                       │ Show error       │
                       └──────────────────┘
```

---

## 🎯 Technical Stack / Tech Stack

### Frontend Framework

- **React 18+** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Zustand** - State management (lightweight, simple)

### UI Framework

- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library (or custom components)
- **Lucide React** - Icons

### Audio Handling

- **Howler.js** - Audio library (or native HTML5 Audio API)
- Support for multiple audio files (paragraphs)
- Seamless transitions between paragraphs

### API Client

- **Axios** - HTTP client
- **React Query** (optional) - Data fetching and caching

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** (optional) - Type safety

---

## 📐 File Structure / Cấu trúc File

```
novel-app/frontend/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   ├── Library/
│   │   │   ├── NovelList.jsx
│   │   │   ├── NovelCard.jsx
│   │   │   ├── NovelUpload.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── Reader/
│   │   │   ├── ReaderView.jsx
│   │   │   ├── ChapterContent.jsx
│   │   │   ├── ParagraphList.jsx
│   │   │   ├── Paragraph.jsx
│   │   │   └── ChapterNavigation.jsx
│   │   ├── Audio/
│   │   │   ├── AudioPlayer.jsx
│   │   │   ├── PlaybackControls.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── SpeedControl.jsx
│   │   │   └── VolumeControl.jsx
│   │   ├── Progress/
│   │   │   ├── ProgressIndicator.jsx
│   │   │   └── ProgressBar.jsx
│   │   └── Common/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Loading.jsx
│   │       └── ErrorMessage.jsx
│   │
│   ├── pages/
│   │   ├── LibraryPage.jsx
│   │   ├── ReaderPage.jsx
│   │   └── SettingsPage.jsx
│   │
│   ├── hooks/
│   │   ├── useAudio.js
│   │   ├── useNovel.js
│   │   ├── useProgress.js
│   │   ├── useGeneration.js
│   │   └── useTheme.js
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── novels.js
│   │   ├── audio.js
│   │   ├── progress.js
│   │   └── generation.js
│   │
│   ├── store/
│   │   ├── useNovelStore.js
│   │   ├── useAudioStore.js
│   │   ├── useProgressStore.js
│   │   └── useUIStore.js
│   │
│   ├── utils/
│   │   ├── format.js
│   │   ├── storage.js
│   │   └── constants.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## ✅ Implementation Checklist / Danh sách Kiểm tra Triển khai

### Phase 1: Setup / Giai đoạn 1: Thiết lập
- [ ] Initialize React + Vite project
- [ ] Install dependencies (React Router, Zustand, Tailwind, Axios)
- [ ] Set up Tailwind CSS
- [ ] Configure routing
- [ ] Create basic layout structure

### Phase 2: Core Components / Giai đoạn 2: Component Cốt lõi
- [ ] Novel Library view
- [ ] Novel Card component
- [ ] Novel Upload component
- [ ] Reader View component
- [ ] Chapter Content component
- [ ] Paragraph component

### Phase 3: Audio Player / Giai đoạn 3: Trình Phát Audio
- [ ] Audio Player component
- [ ] Playback controls
- [ ] Progress bar with seeking
- [ ] Speed control
- [ ] Volume control
- [ ] Auto-advance to next paragraph

### Phase 4: Integration / Giai đoạn 4: Tích hợp
- [ ] API service setup
- [ ] Connect Library to backend
- [ ] Connect Reader to backend
- [ ] Audio generation flow
- [ ] Progress saving

### Phase 5: Enhancement / Giai đoạn 5: Nâng cao
- [ ] Text sync highlighting
- [ ] Chapter navigation
- [ ] Progress tracking UI
- [ ] Generation progress indicator
- [ ] Error handling and retry logic

---

## 🎨 Design Principles / Nguyên tắc Thiết kế

1. **Mobile-First** - Responsive design, works on all devices
2. **Accessibility** - ARIA labels, keyboard navigation
3. **Performance** - Lazy loading, code splitting
4. **User Experience** - Loading states, error handling, feedback
5. **Accessibility** - Screen reader support, keyboard shortcuts

---

**Ready to implement!** 🚀  
**Sẵn sàng triển khai!**

