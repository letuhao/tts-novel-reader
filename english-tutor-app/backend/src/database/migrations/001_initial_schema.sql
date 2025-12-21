-- Initial Database Schema for English Tutor App
-- System settings and user settings tables for hot reload

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System Settings Table
-- Stores application-wide settings that can be hot-reloaded
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    category VARCHAR(100), -- general, ollama, tts, stt, curriculum, etc.
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    CONSTRAINT valid_type CHECK (type IN ('string', 'number', 'boolean', 'json', 'array', 'object'))
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- User Settings Table
-- Stores user-specific settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'string',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_type CHECK (type IN ('string', 'number', 'boolean', 'json', 'array', 'object')),
    CONSTRAINT unique_user_setting UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(10) NOT NULL DEFAULT 'A1', -- CEFR level
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_level CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);

-- User Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    score INTEGER, -- 0-100
    completed_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id),
    CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(completed);

-- Insert default system settings
INSERT INTO system_settings (key, value, type, description, category) VALUES
    ('ollama.base_url', 'http://localhost:11434', 'string', 'Ollama API base URL', 'ollama'),
    ('ollama.default_model', 'gemma3:12b', 'string', 'Default Ollama model for tutoring', 'ollama'),
    ('ollama.timeout', '60000', 'number', 'Ollama request timeout in milliseconds', 'ollama'),
    ('tts.backend_url', 'http://127.0.0.1:11111', 'string', 'TTS backend service URL', 'tts'),
    ('tts.default_voice', 'tutor_female', 'string', 'Default TTS voice', 'tts'),
    ('tts.default_speed', '0.9', 'number', 'Default TTS speech speed (0.8-1.0)', 'tts'),
    ('stt.backend_url', 'http://127.0.0.1:11210', 'string', 'STT backend service URL', 'stt'),
    ('stt.model_size', 'medium', 'string', 'Whisper model size (tiny, base, small, medium, large)', 'stt'),
    ('stt.language', 'en', 'string', 'Default STT language code', 'stt'),
    ('curriculum.default_level', 'A1', 'string', 'Default starting CEFR level for new users', 'curriculum'),
    ('app.name', 'English Tutor', 'string', 'Application name', 'general'),
    ('app.version', '0.1.0', 'string', 'Application version', 'general'),
    ('logging.level', 'info', 'string', 'Logging level (trace, debug, info, warn, error, fatal)', 'general')
ON CONFLICT (key) DO NOTHING;

