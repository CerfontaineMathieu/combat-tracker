-- Create monsters table with JSONB for structured data
CREATE TABLE IF NOT EXISTS monsters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,

    -- Combat stats
    armor_class INTEGER,
    hit_points INTEGER,
    speed VARCHAR(100),

    -- Ability scores
    strength INTEGER,
    dexterity INTEGER,
    constitution INTEGER,
    intelligence INTEGER,
    wisdom INTEGER,
    charisma INTEGER,

    -- Ability modifiers
    strength_mod INTEGER,
    dexterity_mod INTEGER,
    constitution_mod INTEGER,
    intelligence_mod INTEGER,
    wisdom_mod INTEGER,
    charisma_mod INTEGER,

    -- Classification
    creature_type VARCHAR(100),
    size VARCHAR(10),
    challenge_rating_xp INTEGER,

    -- Structured data as JSONB
    -- Array of action objects: [{name, description, attack_type, attack_bonus, damage, damage_type, reach, range}]
    actions JSONB DEFAULT '[]'::jsonb,

    -- Array of legendary action objects: [{name, description, cost}]
    legendary_actions JSONB DEFAULT '[]'::jsonb,

    -- Object with traits: {skills, senses, languages, damage_resistances, damage_immunities, condition_immunities, special_abilities}
    traits JSONB DEFAULT '{}'::jsonb,

    -- Image URLs
    image_url TEXT,           -- External image (e.g., from D&D 5e API)
    ai_generated TEXT,        -- AI-generated image path (local file)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_monsters_name ON monsters(name);
CREATE INDEX idx_monsters_creature_type ON monsters(creature_type);
CREATE INDEX idx_monsters_challenge_rating ON monsters(challenge_rating_xp);

-- GIN indexes for JSONB queries
CREATE INDEX idx_monsters_actions ON monsters USING GIN (actions);
CREATE INDEX idx_monsters_traits ON monsters USING GIN (traits);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player characters table
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(100) NOT NULL,
    level INTEGER DEFAULT 1,
    current_hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    ac INTEGER DEFAULT 10,
    initiative INTEGER DEFAULT 0,
    conditions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_characters_campaign ON characters(campaign_id);

-- Combat monsters table (instances in current combat, separate from bestiary)
CREATE TABLE IF NOT EXISTS combat_monsters (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    monster_id INTEGER REFERENCES monsters(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    ac INTEGER DEFAULT 10,
    initiative INTEGER DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_combat_monsters_campaign ON combat_monsters(campaign_id);

-- Session notes table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    session_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_campaign ON notes(campaign_id);
CREATE INDEX idx_notes_session_date ON notes(session_date);