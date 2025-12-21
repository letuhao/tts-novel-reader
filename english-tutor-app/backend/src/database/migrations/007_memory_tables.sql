-- Migration 007: Memory Management Tables
-- Conversation summaries and key facts for memory management

-- Conversation Summaries Table
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    message_range_start INTEGER NOT NULL,
    message_range_end INTEGER NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_range CHECK (message_range_start <= message_range_end)
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_range ON conversation_summaries(conversation_id, message_range_start, message_range_end);

-- Conversation Key Facts Table
CREATE TABLE IF NOT EXISTS conversation_key_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    fact_type VARCHAR(50) NOT NULL,
    fact_text TEXT NOT NULL,
    confidence DECIMAL(3, 2) DEFAULT 0.5,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_conversation_key_facts_conversation_id ON conversation_key_facts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_key_facts_type ON conversation_key_facts(fact_type);

