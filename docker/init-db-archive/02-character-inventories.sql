-- Character inventories table
-- Stores inventory data for characters (linked by Notion UUID or character ID)
CREATE TABLE IF NOT EXISTS character_inventories (
    id SERIAL PRIMARY KEY,
    character_id VARCHAR(255) NOT NULL UNIQUE, -- Notion page UUID or character ID
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Inventory stored as JSONB for flexibility
    -- Structure: {equipment: [], consumables: [], currency: {}, items: []}
    inventory JSONB NOT NULL DEFAULT '{
        "equipment": [],
        "consumables": [],
        "currency": {"platinum": 0, "gold": 0, "electrum": 0, "silver": 0, "copper": 0},
        "items": []
    }'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by character_id
CREATE INDEX idx_character_inventories_character_id ON character_inventories(character_id);
CREATE INDEX idx_character_inventories_campaign_id ON character_inventories(campaign_id);

-- GIN index for JSONB queries
CREATE INDEX idx_character_inventories_inventory ON character_inventories USING GIN (inventory);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_character_inventories_updated_at
    BEFORE UPDATE ON character_inventories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
