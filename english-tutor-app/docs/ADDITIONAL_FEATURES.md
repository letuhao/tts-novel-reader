# Additional Features for Conversation System

**Date:** 2025-12-21  
**Status:** Design Phase

## Overview

This document lists additional features that could enhance the English tutor conversation system beyond the core functionality.

---

## Essential Features (High Priority)

### 1. User Authentication & Authorization

**Why:** Currently we have users table but no auth system.

**Features:**
- User registration/login
- Session management
- JWT tokens
- Password reset
- Email verification
- OAuth integration (Google, GitHub)

**Database:**
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
```

---

### 2. Grammar Correction Tracking

**Why:** Track corrections to help users learn from mistakes.

**Features:**
- Detect grammar errors in user messages
- Highlight corrections
- Store correction history
- Show correction statistics
- Suggest improvements

**Database:**
```sql
CREATE TABLE IF NOT EXISTS grammar_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    error_type VARCHAR(50), -- 'grammar', 'spelling', 'punctuation', 'word_choice'
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grammar_corrections_message_id ON grammar_corrections(message_id);
CREATE INDEX idx_grammar_corrections_error_type ON grammar_corrections(error_type);
```

**Events:**
```typescript
{
  type: 'grammar:correction-detected',
  data: {
    messageId: string;
    corrections: GrammarCorrection[];
  }
}
```

---

### 3. Vocabulary Tracking

**Why:** Track new words learned to build vocabulary.

**Features:**
- Extract new words from conversations
- Store vocabulary with definitions
- Track word usage frequency
- Vocabulary quizzes
- Spaced repetition system

**Database:**
```sql
CREATE TABLE IF NOT EXISTS vocabulary_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    difficulty_level VARCHAR(10), -- CEFR level
    first_encountered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    mastery_level INTEGER DEFAULT 0, -- 0-100
    CONSTRAINT unique_user_word UNIQUE (user_id, word)
);

CREATE INDEX idx_vocabulary_words_user_id ON vocabulary_words(user_id);
CREATE INDEX idx_vocabulary_words_word ON vocabulary_words(word);
CREATE INDEX idx_vocabulary_words_mastery ON vocabulary_words(mastery_level);
```

---

### 4. Progress Tracking & Analytics

**Why:** Help users see their learning progress.

**Features:**
- Track conversation count
- Track words learned
- Track time spent
- Track grammar improvements
- Learning streaks
- Progress charts/graphs

**Database:**
```sql
-- Already have conversation_analytics table, but expand it
ALTER TABLE conversation_analytics ADD COLUMN IF NOT EXISTS metric_category VARCHAR(50);
-- Categories: 'engagement', 'learning', 'performance', 'time'

-- Add daily progress tracking
CREATE TABLE IF NOT EXISTS daily_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    conversations_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    words_learned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    grammar_corrections INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_progress_user_id ON daily_progress(user_id);
CREATE INDEX idx_daily_progress_date ON daily_progress(date DESC);
```

---

### 5. Message Editing & Deletion

**Why:** Users should be able to correct mistakes or delete messages.

**Features:**
- Edit sent messages (with history)
- Delete messages
- Show edit history
- Update conversation context after edit

**Database:**
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Message edit history
CREATE TABLE IF NOT EXISTS message_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    previous_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_edit_history_message_id ON message_edit_history(message_id);
```

**Events:**
```typescript
{
  type: 'message:edited',
  data: {
    messageId: string;
    previousContent: string;
    newContent: string;
  }
}

{
  type: 'message:deleted',
  data: {
    messageId: string;
    conversationId: string;
  }
}
```

---

## Important Features (Medium Priority)

### 6. Conversation Sharing

**Why:** Share conversations with teachers or peers for feedback.

**Features:**
- Generate shareable links
- Set expiration dates
- Password protection
- View-only access
- Comments on shared conversations

**Database:**
```sql
CREATE TABLE IF NOT EXISTS conversation_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_shares_token ON conversation_shares(share_token);
CREATE INDEX idx_conversation_shares_conversation_id ON conversation_shares(conversation_id);
```

---

### 7. Conversation Bookmarks

**Why:** Bookmark important messages for later review.

**Features:**
- Bookmark messages
- Organize bookmarks
- Quick access to bookmarked messages
- Notes on bookmarks

**Database:**
```sql
CREATE TABLE IF NOT EXISTS message_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_message_bookmark UNIQUE (user_id, message_id)
);

CREATE INDEX idx_message_bookmarks_user_id ON message_bookmarks(user_id);
CREATE INDEX idx_message_bookmarks_message_id ON message_bookmarks(message_id);
```

---

### 8. Typing Indicators

**Why:** Show when AI is thinking/typing for better UX.

**Features:**
- Show typing indicator when AI is processing
- Show chunk generation progress
- Estimate time remaining

**Events:**
```typescript
{
  type: 'typing:started',
  data: {
    conversationId: string;
    estimatedDuration?: number;
  }
}

{
  type: 'typing:stopped',
  data: {
    conversationId: string;
  }
}

{
  type: 'typing:progress',
  data: {
    conversationId: string;
    progress: number; // 0-100
    currentChunk: number;
    totalChunks: number;
  }
}
```

---

### 9. Conversation Folders/Organization

**Why:** Organize conversations into folders.

**Features:**
- Create folders
- Move conversations to folders
- Nested folders
- Folder colors/icons
- Folder search

**Database:**
```sql
CREATE TABLE IF NOT EXISTS conversation_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES conversation_folders(id) ON DELETE CASCADE,
    color VARCHAR(7), -- Hex color
    icon VARCHAR(50),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_folders_user_id ON conversation_folders(user_id);
CREATE INDEX idx_conversation_folders_parent ON conversation_folders(parent_folder_id);

-- Link conversations to folders
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES conversation_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_conversations_folder_id ON conversations(folder_id);
```

---

### 10. Conversation Notes

**Why:** Users can add notes to conversations.

**Features:**
- Add notes to conversations
- Edit/delete notes
- Rich text notes
- Note search

**Database:**
```sql
CREATE TABLE IF NOT EXISTS conversation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_notes_conversation_id ON conversation_notes(conversation_id);
CREATE INDEX idx_conversation_notes_user_id ON conversation_notes(user_id);
```

---

## Nice-to-Have Features (Low Priority)

### 11. Conversation Duplication

**Why:** Duplicate conversations for practice or branching.

**Features:**
- Duplicate conversation
- Duplicate with history
- Duplicate without history
- Rename duplicated conversation

**Events:**
```typescript
{
  type: 'conversation:duplicated',
  data: {
    originalConversationId: string;
    newConversationId: string;
    includeHistory: boolean;
  }
}
```

---

### 12. Conversation Merging

**Why:** Merge related conversations.

**Features:**
- Merge two conversations
- Preserve message order
- Handle conflicts
- Update conversation metadata

---

### 13. Conversation Pinning

**Why:** Pin important conversations to top.

**Features:**
- Pin/unpin conversations
- Multiple pinned conversations
- Custom order for pinned

**Database:**
```sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pin_order INTEGER;
```

---

### 14. Conversation Shortcuts

**Why:** Keyboard shortcuts for faster navigation.

**Features:**
- Keyboard shortcuts
- Customizable shortcuts
- Shortcut hints
- Power user features

---

### 15. Conversation Themes

**Why:** Customize UI appearance.

**Features:**
- Light/dark theme
- Custom colors
- Font size adjustment
- Layout options

---

### 15. Conversation Notifications

**Why:** Notify users of important events.

**Features:**
- New message notifications
- Conversation reminders
- Achievement notifications
- Email notifications
- Push notifications (future)

**Database:**
```sql
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
```

---

## Advanced Features (Future)

### 16. File Attachments

**Why:** Attach images/documents to conversations.

**Features:**
- Upload images
- Upload documents (PDF, DOCX)
- Image analysis
- Document text extraction

### 17. Screen Sharing

**Why:** For live tutoring sessions.

**Features:**
- Screen sharing
- Remote control
- Annotation tools

### 18. Whiteboard

**Why:** Visual explanations.

**Features:**
- Collaborative whiteboard
- Drawing tools
- Shape tools
- Text annotations

### 19. Video/Audio Calls

**Why:** Real-time voice/video tutoring.

**Features:**
- Voice calls
- Video calls
- Screen sharing
- Recording

### 20. Gamification

**Why:** Make learning fun and engaging.

**Features:**
- Achievements/badges
- Points system
- Leaderboards
- Challenges
- Rewards

**Database:**
```sql
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(255) NOT NULL,
    description TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_type)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
```

---

## Feature Priority Matrix

| Feature | Priority | Complexity | Impact | Phase |
|---------|----------|------------|--------|-------|
| User Authentication | High | Medium | Critical | 1 |
| Grammar Correction | High | Medium | High | 1-2 |
| Vocabulary Tracking | High | Medium | High | 1-2 |
| Progress Tracking | High | Low | High | 1 |
| Message Edit/Delete | High | Low | Medium | 2 |
| Conversation Sharing | Medium | Medium | Medium | 2 |
| Bookmarks | Medium | Low | Medium | 2 |
| Typing Indicators | Medium | Low | Medium | 1 |
| Folders | Medium | Medium | Medium | 3 |
| Notes | Medium | Low | Low | 3 |
| Duplication | Low | Low | Low | 3 |
| Pinning | Low | Low | Low | 3 |
| Shortcuts | Low | Low | Low | 3 |
| Themes | Low | Low | Low | 3 |
| Notifications | Low | Medium | Medium | 3 |
| File Attachments | Future | High | Medium | 4 |
| Screen Sharing | Future | High | Low | 4 |
| Whiteboard | Future | High | Low | 4 |
| Video Calls | Future | Very High | Low | 5 |
| Gamification | Future | Medium | Medium | 4 |

---

## Implementation Recommendations

### Phase 1 (MVP+)
1. ✅ Core conversation system (already designed)
2. ✅ Memory management (already designed)
3. ⭐ User Authentication
4. ⭐ Typing Indicators
5. ⭐ Progress Tracking (basic)

### Phase 2 (Essential)
1. Grammar Correction Tracking
2. Vocabulary Tracking
3. Message Edit/Delete
4. Conversation Sharing
5. Bookmarks

### Phase 3 (Important)
1. Conversation Folders
2. Conversation Notes
3. Conversation Pinning
4. Enhanced Analytics

### Phase 4 (Nice-to-Have)
1. Duplication/Merging
2. Shortcuts
3. Themes
4. Notifications

### Phase 5 (Future)
1. File Attachments
2. Screen Sharing
3. Whiteboard
4. Video Calls
5. Gamification

---

## Notes

- Prioritize features based on user needs
- Start with MVP+ features
- Add features incrementally
- Gather user feedback
- Measure feature usage
- Remove unused features

