-- Migration 006: Conversation Events
-- Event logging and audit trail

-- Conversation Events Table (Audit Log)
CREATE TABLE IF NOT EXISTS conversation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_events_conversation_id ON conversation_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_type ON conversation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversation_events_created_at ON conversation_events(created_at DESC);

