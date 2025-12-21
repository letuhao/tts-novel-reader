-- Migration 010: Sharing Features
-- Conversation sharing and collaboration

-- Conversation Shares Table
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

CREATE INDEX IF NOT EXISTS idx_conversation_shares_token ON conversation_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_conversation_id ON conversation_shares(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_created_by ON conversation_shares(created_by);

