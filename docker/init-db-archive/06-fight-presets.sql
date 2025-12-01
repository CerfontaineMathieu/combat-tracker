-- Fight presets for saving prepared encounters
CREATE TABLE IF NOT EXISTS fight_presets (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monsters in a fight preset
CREATE TABLE IF NOT EXISTS fight_preset_monsters (
    id SERIAL PRIMARY KEY,
    preset_id INTEGER NOT NULL REFERENCES fight_presets(id) ON DELETE CASCADE,
    monster_id INTEGER REFERENCES monsters(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    ac INTEGER NOT NULL DEFAULT 10,
    initiative INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fight_presets_campaign ON fight_presets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fight_preset_monsters_preset ON fight_preset_monsters(preset_id);
