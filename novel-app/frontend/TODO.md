# Frontend Implementation TODO List
# Danh sách TODO Triển khai Frontend

## 📋 Status Legend / Chú giải Trạng thái

- ⏳ **Pending** - Not started yet
- 🚧 **In Progress** - Currently working on
- ✅ **Completed** - Finished
- ⏸️ **On Hold** - Paused/temporarily stopped
- ❌ **Cancelled** - No longer needed

---

## 🎯 Phase 1: Project Setup / Giai đoạn 1: Thiết lập Dự án

### 1.1 Initialize React Project
- ✅ Create React + Vite project
- ✅ Set up project structure (folders)
- ✅ Configure Vite build settings
- ✅ Set up development environment

### 1.2 Install Dependencies
- ✅ Install React Router (routing)
- ✅ Install Zustand (state management)
- ✅ Install Tailwind CSS (styling)
- ✅ Install Axios (API client)
- ✅ Install Howler.js (audio library)
- ✅ Install Lucide React (icons)
- ⏳ Install React Query (optional, for API caching)

### 1.3 Configuration
- ✅ Configure Tailwind CSS
- ✅ Set up ESLint
- ✅ Set up Prettier
- ✅ Configure path aliases (if needed)
- ⏳ Create environment variables file (.env)

### 1.4 Basic Layout
- ✅ Create Layout component structure
- ✅ Create Header component (placeholder)
- ⏳ Create Footer component (optional)
- ✅ Set up routing structure
- ✅ Create basic page placeholders

---

## 🎨 Phase 2: Core Components / Giai đoạn 2: Component Cốt lõi

### 2.1 Layout Components
- ✅ Header component
  - ✅ Logo/branding
  - ✅ Navigation menu
  - ✅ Theme toggle (dark/light mode)
  - ⏳ User menu (if needed)

### 2.2 Library View Components
- ✅ LibraryPage component
  - ✅ NovelList component (integrated in LibraryPage)
  - ✅ NovelCard component
    - ✅ Display novel metadata
    - ✅ Show progress indicator
    - ⏳ Quick action buttons (delete button exists)
  - ✅ NovelUpload component
    - ✅ Drag & drop file upload
    - ✅ File picker button
    - ✅ Upload progress indicator
  - ✅ SearchBar component
    - ✅ Search input
    - ⏳ Filter options (needs implementation)

### 2.3 Reader View Components
- ✅ ReaderPage component
- ✅ ReaderHeader component
  - ✅ Back button
  - ✅ Novel title
  - ✅ Chapter navigation (prev/next)
  - ✅ Chapter selector dropdown
  - ⏳ Bookmark button
- ✅ ChapterContent component
  - ⏳ Chapter title (in ReaderHeader)
  - ✅ ParagraphList component (integrated)
    - ✅ Paragraph component
    - ⏳ Paragraph highlighting (sync with audio) - partially implemented
    - ⏳ Paragraph click handler (jump to position)
  - ⏳ Scroll sync (auto-scroll to current paragraph)
- ✅ ProgressIndicator component
  - ✅ Current position (paragraph X of Y)
  - ✅ Chapter progress bar
  - ⏳ Novel progress percentage

### 2.4 Common Components
- ⏳ Button component (using Tailwind classes)
- ⏳ Input component (using Tailwind classes)
- ✅ Loading spinner component
- ✅ ErrorMessage component
- ⏳ Modal component
- ⏳ Dropdown/Select component (using native select)
- ✅ ProgressBar component (integrated in ProgressIndicator)

---

## 🎵 Phase 3: Audio Player / Giai đoạn 3: Trình Phát Audio

### 3.1 AudioPlayer Component
- ✅ AudioPlayer main component
  - ✅ Audio state management
  - ✅ Playback controls integration
  - ✅ Progress tracking
  - ✅ Auto-advance to next paragraph
  - ⏳ Preload next paragraph audio

### 3.2 Playback Controls
- ✅ PlayButton component (integrated in AudioPlayer)
  - ✅ Play/Pause toggle
  - ✅ Loading state
- ✅ PreviousButton component (integrated in AudioPlayer)
  - ✅ Jump to previous paragraph
  - ✅ Disable at first paragraph
- ✅ NextButton component (integrated in AudioPlayer)
  - ✅ Jump to next paragraph
  - ⏳ Auto-advance to next chapter at end (only advances to end of chapter)
- ✅ ProgressBar component (integrated in AudioPlayer)
  - ✅ Visual progress indicator
  - ⏳ Seek functionality (click to jump) - need to add
  - ✅ Current time display
  - ✅ Duration display

### 3.3 Audio Controls
- ✅ SpeedControl component (integrated in AudioPlayer)
  - ✅ Playback speed selector (0.5x - 2.0x)
  - ✅ Visual speed indicator (dropdown)
- ✅ VolumeControl component (integrated in AudioPlayer)
  - ✅ Volume slider
  - ✅ Mute/unmute button
- ⏳ Audio settings menu
  - ⏳ Quality settings (if applicable)
  - ⏳ Advanced options

### 3.4 Audio Management
- ✅ Audio file loading logic
- ✅ Multiple audio files handling (paragraphs)
- ✅ Seamless transition between paragraphs
- ✅ Audio event handling (play, pause, ended, error)
- ⏳ Audio preloading strategy (loads on-demand)

---

## 🔄 Phase 4: State Management / Giai đoạn 4: Quản lý Trạng thái

### 4.1 Zustand Stores
- ✅ NovelStore
  - ✅ novels: Array<Novel>
  - ✅ currentNovel: Novel | null
  - ✅ loading: boolean
  - ✅ error: string | null
  - ✅ Actions: fetchNovels, fetchNovel, addNovel, removeNovel

- ✅ ReaderStore
  - ✅ novelId: string | null
  - ✅ chapterNumber: number | null
  - ✅ paragraphs: Array<Paragraph>
  - ✅ currentParagraphNumber: number | null
  - ✅ chapterTitle: string | null
  - ✅ Actions: loadChapter, setCurrentParagraph, setNovelId

- ✅ AudioStore
  - ✅ isPlaying: boolean
  - ✅ currentTime: number
  - ✅ duration: number
  - ✅ playbackRate: number
  - ✅ volume: number
  - ✅ audioFiles: Array<AudioFile>
  - ✅ currentAudioIndex: number
  - ✅ isLoading: boolean
  - ✅ Actions: play, pause, seek, setPlaybackRate, setVolume, setAudioFiles, setCurrentAudioIndex

- ✅ ProgressStore
  - ✅ currentNovelId: string | null
  - ✅ currentChapter: number | null
  - ✅ currentParagraph: number | null
  - ✅ audioPosition: number
  - ✅ lastSaved: Date | null
  - ✅ Actions: saveProgress, loadProgress, updatePosition, setCurrentChapter, setCurrentParagraph

- ✅ GenerationStore
  - ✅ novelId: string | null
  - ✅ chapterNumber: number | null
  - ✅ status: 'idle' | 'generating' | 'completed' | 'failed'
  - ✅ progress: { total, completed, failed, pending, byStatus }
  - ✅ Actions: startGeneration, updateProgress, completeGeneration, failGeneration, reset

- ✅ UIStore (useThemeStore)
  - ✅ theme: 'light' | 'dark'
  - ✅ sidebarOpen: boolean
  - ✅ currentView: 'library' | 'reader' | 'settings'
  - ✅ Actions: toggleTheme, setSidebarOpen, setCurrentView

### 4.2 State Persistence
- ✅ Save theme preference to localStorage (via Zustand persist)
- ✅ Save reading progress to backend (auto-save) - implemented in AudioPlayer
- ⏳ Backup progress to localStorage (fallback)
- ⏳ Restore state on page reload (partially - theme works, progress needs implementation)

---

## 🔌 Phase 5: API Integration / Giai đoạn 5: Tích hợp API

### 5.1 API Service Setup
- ✅ Create API base configuration
  - ✅ Set API base URL from env (with fallback)
  - ✅ Configure Axios instance
  - ✅ Add request interceptors
  - ✅ Add response interceptors
  - ✅ Error handling middleware

### 5.2 API Services
- ✅ novels.ts
  - ✅ getAll(): GET /api/novels
  - ✅ getById(id): GET /api/novels/:id
  - ✅ upload(file): POST /api/novels/upload
  - ✅ process(filePath): POST /api/novels/process
  - ✅ remove(id): DELETE /api/novels/:id
  - ⏳ getChapters(id): GET /api/novels/:id/chapters (not needed, using getById)
  - ✅ getChapter(id, chapterNumber): via chapters.ts

- ✅ chapters.ts
  - ✅ getChapter(novelId, chapterNumber): GET /api/novels/:novelId/chapters/:chapterNumber
  - ✅ getChapters(novelId): GET /api/novels/:novelId/chapters

- ✅ audio.ts
  - ✅ getChapterAudio(novelId, chapterNumber): GET /api/audio/:novelId/:chapterNumber
  - ✅ generateChapter(novelId, chapterNumber, options): POST /api/worker/generate/chapter
  - ⏳ getAudioFile(fileId): GET /api/tts/audio/:fileId (not needed, using URLs)

- ✅ progress.ts
  - ✅ get(novelId): GET /api/progress/:novelId
  - ✅ save(progressData): POST /api/progress/save
  - ⏳ update(id, updates): PUT /api/progress/:id (using save instead)

- ✅ generation.ts
  - ✅ getChapterStats(novelId, chapterNumber): GET /api/generation/novel/:id/chapter/:num/stats
  - ✅ getChapterProgress(novelId, chapterNumber): GET /api/generation/novel/:id/chapter/:num

### 5.3 Custom Hooks
- ✅ useNovelStore hook (Zustand store instead of custom hook)
  - ✅ Fetch novels
  - ✅ Load novel by ID
  - ✅ Upload novel (via service)
  - ✅ Delete novel
  - ✅ Loading and error states

- ✅ useReaderStore hook (Zustand store instead of custom hook)
  - ✅ Load chapter content
  - ✅ Load paragraphs
  - ✅ Navigation between chapters

- ✅ useAudioStore hook (Zustand store instead of custom hook)
  - ✅ Initialize audio player (in AudioPlayer component)
  - ✅ Play/pause control
  - ✅ Seek functionality (via Howler)
  - ✅ Speed control
  - ✅ Volume control
  - ✅ Progress tracking
  - ✅ Auto-advance logic

- ✅ useProgressStore hook (Zustand store instead of custom hook)
  - ✅ Load saved progress
  - ✅ Save progress (with debouncing in AudioPlayer)
  - ✅ Update progress position
  - ⏳ Resume from last position (needs implementation)

- ✅ useGenerationStore hook (Zustand store instead of custom hook)
  - ✅ Start audio generation
  - ✅ Poll generation progress (in ReaderPage)
  - ✅ Monitor generation status
  - ✅ Handle generation completion

- ✅ useThemeStore hook (Zustand store instead of custom hook)
  - ✅ Get current theme
  - ✅ Toggle theme
  - ✅ Persist theme preference

---

## 🔄 Phase 6: Business Logic Integration / Giai đoạn 6: Tích hợp Logic Nghiệp vụ

### 6.1 Novel Library Flow
- ✅ Display novels from backend
- ✅ Upload novel file
- ✅ Show upload progress
- ⏳ Process novel (wait for parsing) - upload handles it
- ✅ Display parsed novel in library
- ⏳ Search/filter novels (search bar exists, filtering not implemented)
- ✅ Delete novel (button exists, needs confirmation)

### 6.2 Reading Flow
- ✅ Select novel from library
- ✅ Load novel metadata
- ⏳ Load last reading progress (progress store exists, needs integration)
- ✅ Navigate to reader view
- ✅ Load chapter content
- ✅ Check audio availability
- ✅ Display chapter with paragraphs

### 6.3 Audio Playback Flow
- ✅ User clicks play button (in AudioPlayer)
- ✅ Check if audio exists (in ReaderPage)
  - ✅ YES: Load audio files
  - ✅ NO: Generate audio on-demand (via button)
- ✅ Show generation progress (if generating)
- ✅ Load generated audio
- ✅ Initialize audio player
- ✅ Start playback
- ✅ Track progress (interval updates)
- ⏳ Highlight current paragraph (partially - needs scroll sync)
- ✅ Auto-advance to next paragraph
- ✅ Auto-save progress (debounced - every 5 seconds)

### 6.4 Progress Saving Flow
- ✅ Listen to audio timeupdate events (via interval)
- ✅ Collect progress data
- ✅ Debounce save requests (5 seconds)
- ✅ POST to /api/progress/save
- ⏳ Update UI (last saved timestamp) - needs implementation
- ⏳ Handle save errors (queue for retry) - basic error handling

### 6.5 Chapter Navigation Flow
- ✅ User clicks next/previous chapter (in ReaderHeader)
- ⏳ Save current progress (needs implementation)
- ✅ Stop current playback (handled by AudioPlayer cleanup)
- ✅ Load new chapter
- ✅ Check audio availability
- ✅ Update UI (chapter content, navigation)
- ⏳ Restore position (if resuming) - needs implementation

### 6.6 Resume Reading Flow
- ⏳ Load saved progress on novel open (progress store exists)
- ⏳ Load last chapter (needs implementation)
- ⏳ Scroll to last paragraph (needs implementation)
- ⏳ Highlight last position (needs implementation)
- ⏳ Show "Resume" button (needs implementation)
- ⏳ On resume: Load audio and seek to position (needs implementation)

---

## 🎨 Phase 7: UI/UX Polish / Giai đoạn 7: Hoàn thiện UI/UX

### 7.1 Styling & Theming
- ⏳ Apply Tailwind CSS styles
- ⏳ Implement dark mode theme
- ⏳ Implement light mode theme
- ⏳ Theme transitions (smooth color changes)
- ⏳ Responsive design (mobile, tablet, desktop)
- ⏳ Loading states styling
- ⏳ Error states styling

### 7.2 Animations & Transitions
- ⏳ Page transitions
- ⏳ Component animations (fade in, slide)
- ⏳ Progress bar animations
- ⏳ Button hover effects
- ⏳ Loading spinners

### 7.3 Accessibility
- ⏳ ARIA labels for interactive elements
- ⏳ Keyboard navigation support
- ⏳ Keyboard shortcuts
  - ⏳ Space: Play/Pause
  - ⏳ Arrow Left: Previous paragraph
  - ⏳ Arrow Right: Next paragraph
  - ⏳ Arrow Up: Increase speed
  - ⏳ Arrow Down: Decrease speed
- ⏳ Screen reader support
- ⏳ Focus management

### 7.4 Error Handling UI
- ⏳ Error message displays
- ⏳ Retry buttons
- ⏳ Error notifications/toasts
- ⏳ Offline detection
- ⏳ Network error handling
- ⏳ API error handling

---

## 🚀 Phase 8: Enhanced Features / Giai đoạn 8: Tính năng Nâng cao

### 8.1 Generation Progress UI
- ⏳ GenerationProgress component
  - ⏳ Progress bar
  - ⏳ Completed/failed/pending counts
  - ⏳ Real-time updates
  - ⏳ Cancel generation option
  - ⏳ Success/error notifications

### 8.2 Chapter Queue/Playlist
- ⏳ Playlist component
  - ⏳ Add chapters to queue
  - ⏳ Reorder chapters (drag & drop)
  - ⏳ Remove from queue
  - ⏳ Auto-play next in queue
  - ⏳ Shuffle/repeat options

### 8.3 Bookmarks
- ⏳ Bookmark component
  - ⏳ Add bookmark at current position
  - ⏳ List bookmarks
  - ⏳ Jump to bookmark
  - ⏳ Delete bookmark
  - ⏳ Bookmark labels/notes

### 8.4 Reading Statistics
- ⏳ Statistics component
  - ⏳ Total reading time
  - ⏳ Progress charts
  - ⏳ Completed novels count
  - ⏳ Reading streaks

### 8.5 Settings Page
- ⏳ SettingsPage component
  - ⏳ Playback settings
    - ⏳ Default playback speed
    - ⏳ Default volume
    - ⏳ Auto-play next
  - ⏳ Theme settings
    - ⏳ Theme selector
    - ⏳ Custom theme colors
  - ⏳ UI preferences
    - ⏳ Font size
    - ⏳ Line spacing
    - ⏳ Layout preferences

---

## 🧪 Phase 9: Testing & Optimization / Giai đoạn 9: Kiểm thử & Tối ưu

### 9.1 Component Testing
- ⏳ Test Library components
- ⏳ Test Reader components
- ⏳ Test AudioPlayer component
- ⏳ Test Progress components
- ⏳ Test Navigation components

### 9.2 Integration Testing
- ⏳ Test API integration
- ⏳ Test audio playback flow
- ⏳ Test progress saving flow
- ⏳ Test chapter navigation flow
- ⏳ Test error handling

### 9.3 Performance Optimization
- ⏳ Code splitting (lazy loading routes)
- ⏳ Component lazy loading
- ⏳ Image optimization (if needed)
- ⏳ Audio preloading optimization
- ⏳ Memory leak prevention
- ⏳ Bundle size optimization

### 9.4 Browser Testing
- ⏳ Test in Chrome
- ⏳ Test in Firefox
- ⏳ Test in Safari
- ⏳ Test in Edge
- ⏳ Test mobile browsers

---

## 📝 Phase 10: Documentation & Polish / Giai đoạn 10: Tài liệu & Hoàn thiện

### 10.1 Documentation
- ⏳ README.md for frontend
- ⏳ Component documentation
- ⏳ API integration guide
- ⏳ Development guide
- ⏳ Deployment guide

### 10.2 Final Polish
- ⏳ Code cleanup
- ⏳ Remove unused code
- ⏳ Optimize imports
- ⏳ Add comments where needed
- ⏳ Final UI/UX adjustments

---

## 📊 Progress Summary / Tóm tắt Tiến độ

### Overall Progress
- **Phase 1**: ✅ ~90% - Project setup complete (missing .env file)
- **Phase 2**: ✅ ~85% - Core components complete (missing some polish)
- **Phase 3**: ✅ ~90% - Audio player functional (missing preloading)
- **Phase 4**: ✅ ~95% - State management complete (missing some persistence)
- **Phase 5**: ✅ ~90% - API integration complete (missing some endpoints)
- **Phase 6**: ✅ ~75% - Business logic integrated (missing resume flow)
- **Phase 7**: ⏳ ~30% - UI/UX polish started (dark mode works, needs more)
- **Phase 8**: ⏳ ~10% - Enhanced features not started
- **Phase 9**: ⏳ 0% - Testing not started
- **Phase 10**: ⏳ ~20% - Documentation started (BUILD_INSTRUCTIONS.md created)

**Total Progress: ~60% (120+/200+ tasks)**

---

## 🎯 Quick Start Priorities / Ưu tiên Bắt đầu Nhanh

### Must Have (MVP) / Phải có
1. ✅ Phase 1: Project Setup
2. ✅ Phase 2: Core Components (Library, Reader)
3. ✅ Phase 3: Audio Player (basic playback)
4. ✅ Phase 4: State Management (basic stores)
5. ✅ Phase 5: API Integration (basic endpoints)
6. ✅ Phase 6: Business Logic (reading, playback)

### Nice to Have / Nên có
7. Phase 7: UI/UX Polish
8. Phase 8: Enhanced Features
9. Phase 9: Testing & Optimization
10. Phase 10: Documentation

---

## 📌 Notes / Ghi chú

- Update status as tasks are completed
- Add notes for any blockers or issues
- Check off items as you go: `- [x] Task name`
- Mark priority items with 🔥

---

**Last Updated:** 2025-01-XX  
**Cập nhật lần cuối:** 2025-01-XX

---

## 🎯 Implementation Summary / Tóm tắt Triển khai

### ✅ Completed / Đã hoàn thành

#### Phase 1: Project Setup (~90%)
- ✅ React + TypeScript + Vite project created
- ✅ Strict TypeScript mode enabled
- ✅ All dependencies installed and configured
- ✅ Tailwind CSS configured
- ✅ ESLint and Prettier set up
- ✅ Path aliases configured
- ✅ Routing structure set up
- ✅ Basic layout and pages created

#### Phase 2: Core Components (~85%)
- ✅ Layout component with header, navigation, theme toggle
- ✅ LibraryPage with novel list, cards, upload, search
- ✅ ReaderPage with chapter content
- ✅ ReaderHeader with navigation
- ✅ ChapterContent component
- ✅ ProgressIndicator component
- ✅ Common components (Loading, ErrorMessage)
- ⏳ Some polish and enhancements needed

#### Phase 3: Audio Player (~90%)
- ✅ Full AudioPlayer component with Howler.js
- ✅ Play/pause controls
- ✅ Previous/next paragraph navigation
- ✅ Progress tracking and display
- ✅ Volume and speed controls
- ✅ Auto-advance between paragraphs
- ✅ Seamless playback across multiple audio files
- ⏳ Audio preloading optimization needed

#### Phase 4: State Management (~95%)
- ✅ All Zustand stores created and typed
- ✅ NovelStore for novel management
- ✅ ReaderStore for reading state
- ✅ AudioStore for audio playback
- ✅ ProgressStore for reading progress
- ✅ GenerationStore for audio generation
- ✅ UIStore (useThemeStore) for UI preferences
- ✅ Theme persistence to localStorage
- ⏳ Progress persistence to backend needs completion

#### Phase 5: API Integration (~90%)
- ✅ API base configuration with Axios
- ✅ Request/response interceptors
- ✅ Error handling middleware
- ✅ All API services implemented:
  - ✅ novels.ts - Novel CRUD operations
  - ✅ chapters.ts - Chapter retrieval
  - ✅ audio.ts - Audio management
  - ✅ progress.ts - Progress tracking
  - ✅ generation.ts - Generation progress
- ⏳ Some optional endpoints not implemented

#### Phase 6: Business Logic (~75%)
- ✅ Novel library flow (display, upload, delete)
- ✅ Reading flow (select novel, load chapters)
- ✅ Audio playback flow (generate, load, play)
- ✅ Generation progress tracking
- ✅ Auto-save progress (every 5 seconds)
- ⏳ Resume reading flow needs completion
- ⏳ Scroll sync with audio needs implementation
- ⏳ Chapter navigation progress saving needed

### ⏳ In Progress / Đang thực hiện

#### Phase 7: UI/UX Polish (~30%)
- ✅ Dark mode theme implemented
- ✅ Basic styling with Tailwind CSS
- ⏳ More animations and transitions needed
- ⏳ Responsive design improvements
- ⏳ Accessibility enhancements
- ⏳ Keyboard shortcuts

### 🔜 Next Priorities / Ưu tiên Tiếp theo

1. **Resume Reading Flow** - Load saved progress and resume from last position
2. **Scroll Sync** - Auto-scroll to current paragraph during playback
3. **Enhanced UI/UX** - More polish, animations, responsive design
4. **Testing** - Component and integration testing
5. **Documentation** - Complete API docs and user guides

### 📝 Notes / Ghi chú

- All core functionality is working
- TypeScript strict mode ensures type safety
- Zustand stores provide clean state management
- Howler.js enables seamless audio playback
- Progress tracking and auto-save are functional
- Ready for testing and refinement

