-- Migration 009: Organization Features
-- Folders, notes, and conversation organization

-- Conversation Folders Table
CREATE TABLE IF NOT EXISTS conversation_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES conversation_folders(id) ON DELETE CASCADE,
    color VARCHAR(7),
    icon VARCHAR(50),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_folders_user_id ON conversation_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_folders_parent ON conversation_folders(parent_folder_id);

-- Add foreign key for folder_id in conversations (already has column from migration 003)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_folder_id_fkey'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_folder_id_fkey 
        FOREIGN KEY (folder_id) REFERENCES conversation_folders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Conversation Notes Table
CREATE TABLE IF NOT EXISTS conversation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_notes_conversation_id ON conversation_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_notes_user_id ON conversation_notes(user_id);

