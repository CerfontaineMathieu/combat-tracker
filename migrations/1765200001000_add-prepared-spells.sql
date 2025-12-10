-- Character prepared spells table
-- Links characters to spells they have prepared
CREATE TABLE IF NOT EXISTS character_prepared_spells (
    id SERIAL PRIMARY KEY,
    character_id TEXT NOT NULL,
    campaign_id INTEGER NOT NULL DEFAULT 1,
    spell_id INTEGER NOT NULL REFERENCES spell_catalog(id) ON DELETE CASCADE,
    is_always_prepared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, campaign_id, spell_id)
);

CREATE INDEX IF NOT EXISTS idx_prepared_spells_character ON character_prepared_spells(character_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_prepared_spells_spell ON character_prepared_spells(spell_id);
