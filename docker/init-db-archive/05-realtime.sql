-- Combat sessions table (save/restore combat state)
CREATE TABLE IF NOT EXISTS combat_sessions (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT false,
    current_turn INTEGER DEFAULT 0,
    round_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Combat session participants (snapshot of combat state)
CREATE TABLE IF NOT EXISTS combat_session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES combat_sessions(id) ON DELETE CASCADE,
    participant_type VARCHAR(10) NOT NULL CHECK (participant_type IN ('player', 'monster')),
    source_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    initiative INTEGER DEFAULT 0,
    current_hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    ac INTEGER DEFAULT 10,
    conditions JSONB DEFAULT '[]'::jsonb,
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room codes for player joining
CREATE TABLE IF NOT EXISTS room_codes (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add room_code column to campaigns for quick access
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS room_code VARCHAR(6) UNIQUE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_combat_sessions_campaign ON combat_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_sessions_active ON combat_sessions(campaign_id, is_active);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON combat_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_room_codes_code ON room_codes(code);
CREATE INDEX IF NOT EXISTS idx_room_codes_campaign ON room_codes(campaign_id);

-- Ensure only one active session per campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_campaign
ON combat_sessions(campaign_id) WHERE is_active = true;
