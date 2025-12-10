-- Spell catalog table for storing spells synced from Notion
CREATE TABLE IF NOT EXISTS spell_catalog (
    id SERIAL PRIMARY KEY,
    notion_id TEXT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    classes TEXT[] NOT NULL DEFAULT '{}',
    casting_time VARCHAR(100),
    range VARCHAR(100),
    duration VARCHAR(100),
    components VARCHAR(100),
    concentration BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    higher_levels TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_spell_catalog_level ON spell_catalog(level);
CREATE INDEX IF NOT EXISTS idx_spell_catalog_name ON spell_catalog(name);
CREATE INDEX IF NOT EXISTS idx_spell_catalog_notion_id ON spell_catalog(notion_id);
CREATE INDEX IF NOT EXISTS idx_spell_catalog_classes ON spell_catalog USING GIN(classes);
