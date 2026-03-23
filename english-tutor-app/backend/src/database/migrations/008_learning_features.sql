-- Migration 008: Learning Features
-- Grammar correction, vocabulary tracking, and progress

-- Grammar Corrections Table
CREATE TABLE IF NOT EXISTS grammar_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    error_type VARCHAR(50),
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grammar_corrections_message_id ON grammar_corrections(message_id);
CREATE INDEX IF NOT EXISTS idx_grammar_corrections_error_type ON grammar_corrections(error_type);

-- Vocabulary Words Table
CREATE TABLE IF NOT EXISTS vocabulary_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    difficulty_level VARCHAR(10),
    first_encountered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    mastery_level INTEGER DEFAULT 0,
    CONSTRAINT unique_user_word UNIQUE (user_id, word),
    CONSTRAINT valid_mastery CHECK (mastery_level >= 0 AND mastery_level <= 100),
    CONSTRAINT valid_level CHECK (difficulty_level IS NULL OR difficulty_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_words_user_id ON vocabulary_words(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_word ON vocabulary_words(word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_mastery ON vocabulary_words(mastery_level);

-- Daily Progress Table
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

CREATE INDEX IF NOT EXISTS idx_daily_progress_user_id ON daily_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date DESC);

-- Conversation Analytics Table (expanded)
CREATE TABLE IF NOT EXISTS conversation_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2) NOT NULL,
    metric_unit VARCHAR(20),
    metric_category VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_conversation_metric UNIQUE (conversation_id, metric_name, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_metric_name ON conversation_analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_category ON conversation_analytics(metric_category);

