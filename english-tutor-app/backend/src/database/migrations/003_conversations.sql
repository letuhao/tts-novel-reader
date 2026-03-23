-- Migration 003: Conversations
-- Core conversation management tables

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    level VARCHAR(10) NOT NULL DEFAULT 'A1',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    metadata JSONB,
    memory_strategy VARCHAR(20) DEFAULT 'sliding',
    max_context_messages INTEGER DEFAULT 20,
    max_context_tokens INTEGER DEFAULT 4000,
    auto_summarize BOOLEAN DEFAULT false,
    summarize_threshold INTEGER DEFAULT 50,
    ai_settings JSONB DEFAULT '{}'::jsonb,
    is_pinned BOOLEAN DEFAULT false,
    pinned_at TIMESTAMP WITH TIME ZONE,
    pin_order INTEGER,
    folder_id UUID, -- Will reference conversation_folders (created later)
    exported_at TIMESTAMP WITH TIME ZONE,
    export_format VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_level CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    CONSTRAINT valid_memory_strategy CHECK (memory_strategy IN ('sliding', 'summarization', 'hierarchical', 'semantic'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_level ON conversations(level);
CREATE INDEX IF NOT EXISTS idx_conversations_folder_id ON conversations(folder_id);
CREATE INDEX IF NOT EXISTS idx_conversations_is_pinned ON conversations(is_pinned);

-- Conversation Tags Table
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_conversation_tag UNIQUE (conversation_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag ON conversation_tags(tag);

-- Conversation Templates Table
CREATE TABLE IF NOT EXISTS conversation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(10) NOT NULL,
    system_prompt TEXT NOT NULL,
    initial_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_level CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

CREATE INDEX IF NOT EXISTS idx_conversation_templates_level ON conversation_templates(level);

