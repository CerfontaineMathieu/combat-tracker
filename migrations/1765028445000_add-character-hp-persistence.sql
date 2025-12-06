-- Store persistent HP for characters (survives sessions)
-- Uses Notion character ID (odNumber) as reference

CREATE TABLE IF NOT EXISTS character_hp (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id VARCHAR(255) NOT NULL,  -- Notion odNumber
    current_hp INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_character_hp_campaign ON character_hp(campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_hp_character ON character_hp(character_id);
