# Database Schema Documentation

## Overview

The English Tutor App uses PostgreSQL as the primary database. The schema is designed to support:
- System-wide settings (hot-reloadable)
- User-specific settings
- User management
- Learning progress tracking

## Database Tables

### 1. system_settings

Application-wide settings that can be hot-reloaded without restarting the server.

**Columns:**
- `id` (UUID, Primary Key)
- `key` (VARCHAR(255), Unique, NOT NULL) - Setting key (e.g., 'ollama.base_url')
- `value` (TEXT, NOT NULL) - Setting value (stored as string, parsed by type)
- `type` (VARCHAR(50), NOT NULL) - Value type: 'string', 'number', 'boolean', 'json', 'array', 'object'
- `description` (TEXT) - Human-readable description
- `category` (VARCHAR(100)) - Category grouping: 'general', 'ollama', 'tts', 'stt', 'curriculum'
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Last update timestamp
- `updated_by` (VARCHAR(255)) - User/process that last updated the setting

**Default Settings:**
- `ollama.base_url` - Ollama API base URL
- `ollama.default_model` - Default Ollama model (gemma3:12b)
- `ollama.timeout` - Request timeout in milliseconds
- `tts.backend_url` - TTS service URL
- `tts.default_voice` - Default TTS voice
- `tts.default_speed` - Default speech speed
- `stt.backend_url` - STT service URL
- `stt.model_size` - Whisper model size
- `stt.language` - Default language code
- `curriculum.default_level` - Default CEFR level for new users
- `app.name` - Application name
- `app.version` - Application version
- `logging.level` - Logging level

### 2. user_settings

User-specific settings and preferences.

**Columns:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, NOT NULL, Foreign Key → users.id)
- `key` (VARCHAR(255), NOT NULL) - Setting key
- `value` (TEXT, NOT NULL) - Setting value
- `type` (VARCHAR(50), NOT NULL) - Value type
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Last update timestamp

**Unique Constraint:** (user_id, key)

**Example Settings:**
- `theme` - UI theme preference
- `language` - Display language
- `notifications.enabled` - Notification preferences
- `audio.speed` - Audio playback speed
- `lesson.autoplay` - Auto-play next lesson

### 3. users

User accounts and basic information.

**Columns:**
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique, NOT NULL)
- `name` (VARCHAR(255), NOT NULL)
- `level` (VARCHAR(10), NOT NULL, Default: 'A1') - CEFR level: A1, A2, B1, B2, C1, C2
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 4. user_progress

Tracks user learning progress for lessons.

**Columns:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, NOT NULL, Foreign Key → users.id, ON DELETE CASCADE)
- `lesson_id` (VARCHAR(255), NOT NULL)
- `completed` (BOOLEAN, NOT NULL, Default: false)
- `score` (INTEGER) - Score 0-100
- `completed_at` (TIMESTAMP WITH TIME ZONE)
- `attempts` (INTEGER, NOT NULL, Default: 0)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Unique Constraint:** (user_id, lesson_id)

### 5. schema_migrations

Tracks applied database migrations.

**Columns:**
- `version` (INTEGER, Primary Key)
- `name` (VARCHAR(255), NOT NULL)
- `applied_at` (TIMESTAMP WITH TIME ZONE)

## Indexes

All tables have appropriate indexes for common query patterns:
- Primary keys (automatic index)
- Foreign keys
- Unique constraints
- Frequently queried columns (email, user_id, category, etc.)

## Hot Reload System

System settings are designed for hot-reload capability:

1. **Caching:** Settings are cached in memory with TTL (default: 5 seconds)
2. **Cache Invalidation:** Setting updates automatically clear cache
3. **Type Safety:** Values are parsed according to type field
4. **No Restart Required:** Services can reload settings without server restart

## Usage Examples

### System Settings Service

```typescript
import { getSystemSettingsService } from './services/settings/systemSettingsService.js';

const settings = getSystemSettingsService();

// Get a setting value (typed)
const ollamaUrl = await settings.getValue<string>('ollama.base_url');
const timeout = await settings.getValue<number>('ollama.timeout');
const enabled = await settings.getValue<boolean>('feature.enabled');

// Update a setting (triggers cache invalidation)
await settings.setSetting('ollama.timeout', 30000, 'number', 'Updated timeout', 'ollama');

// Get all settings by category
const ollamaSettings = await settings.getSettingsByCategory('ollama');
```

### User Settings Service

```typescript
import { getUserSettingsService } from './services/settings/userSettingsService.js';

const userSettings = getUserSettingsService();
const userId = 'user-uuid';

// Get user setting
const theme = await userSettings.getUserValue<string>(userId, 'theme', 'light');

// Set user setting
await userSettings.setUserSetting(userId, 'audio.speed', 1.2, 'number');
```

## Migration System

Migrations are automatically run on server startup:

1. Check `schema_migrations` table for applied migrations
2. Compare with available migration files
3. Run unapplied migrations in order
4. Record applied migrations

Migration files are located in: `backend/src/database/migrations/`

## Future Schema Additions

Planned tables (to be added in future migrations):
- `lessons` - Lesson content and metadata
- `exercises` - Exercise definitions
- `user_sessions` - User session tracking
- `conversations` - Conversation history with AI tutor
- `vocabulary` - User vocabulary progress
- `grammar_practice` - Grammar practice records

