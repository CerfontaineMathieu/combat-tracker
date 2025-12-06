-- Store persistent conditions and exhaustion for characters (survives sessions)
-- Uses Notion character ID (odNumber) as reference, same pattern as character_hp

CREATE TABLE IF NOT EXISTS character_status (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id VARCHAR(255) NOT NULL,  -- Notion odNumber
    conditions JSONB DEFAULT '[]'::jsonb,
    exhaustion_level INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_character_status_campaign ON character_status(campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_status_character ON character_status(character_id);
