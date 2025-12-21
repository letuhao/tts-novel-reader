-- Migration 005: Message Chunks
-- Chunk-level storage for structured responses

-- Message Chunks Table
CREATE TABLE IF NOT EXISTS message_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    emotion VARCHAR(50),
    icon VARCHAR(10),
    pause_after DECIMAL(5, 2),
    emphasis BOOLEAN DEFAULT false,
    audio_file_id VARCHAR(255),
    audio_duration DECIMAL(10, 3),
    tts_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_emotion CHECK (emotion IN ('happy', 'encouraging', 'neutral', 'excited', 'calm', 'curious', 'supportive')),
    CONSTRAINT valid_tts_status CHECK (tts_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT unique_message_chunk UNIQUE (message_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_message_chunks_message_id ON message_chunks(message_id);
CREATE INDEX IF NOT EXISTS idx_message_chunks_tts_status ON message_chunks(tts_status);
CREATE INDEX IF NOT EXISTS idx_message_chunks_chunk_index ON message_chunks(message_id, chunk_index);

