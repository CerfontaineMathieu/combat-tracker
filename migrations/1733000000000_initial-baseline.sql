-- Migration: initial-baseline
-- Description: Consolidates all existing database schema into a single baseline migration
-- This migration is idempotent - safe to run multiple times

-- ============================================================================
-- CORE TABLES (from 01-schema.sql)
-- ============================================================================

-- Monsters table with JSONB for structured data
CREATE TABLE IF NOT EXISTS monsters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    armor_class INTEGER,
    hit_points INTEGER,
    speed VARCHAR(100),
    strength INTEGER,
    dexterity INTEGER,
    constitution INTEGER,
    intelligence INTEGER,
    wisdom INTEGER,
    charisma INTEGER,
    strength_mod INTEGER,
    dexterity_mod INTEGER,
    constitution_mod INTEGER,
    intelligence_mod INTEGER,
    wisdom_mod INTEGER,
    charisma_mod INTEGER,
    creature_type VARCHAR(100),
    size VARCHAR(10),
    challenge_rating_xp INTEGER,
    actions JSONB DEFAULT '[]'::jsonb,
    legendary_actions JSONB DEFAULT '[]'::jsonb,
    traits JSONB DEFAULT '{}'::jsonb,
    image_url TEXT,
    ai_generated TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Combat monsters table
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

-- ============================================================================
-- INDEXES (from 01-schema.sql)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
CREATE INDEX IF NOT EXISTS idx_monsters_creature_type ON monsters(creature_type);
CREATE INDEX IF NOT EXISTS idx_monsters_challenge_rating ON monsters(challenge_rating_xp);
CREATE INDEX IF NOT EXISTS idx_monsters_actions ON monsters USING GIN (actions);
CREATE INDEX IF NOT EXISTS idx_monsters_traits ON monsters USING GIN (traits);
CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_monsters_campaign ON combat_monsters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notes_campaign ON notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notes_session_date ON notes(session_date);

-- ============================================================================
-- CHARACTER INVENTORIES (from 02-character-inventories.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_inventories (
    id SERIAL PRIMARY KEY,
    character_id VARCHAR(255) NOT NULL UNIQUE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    inventory JSONB NOT NULL DEFAULT '{
        "equipment": [],
        "consumables": [],
        "currency": {"platinum": 0, "gold": 0, "electrum": 0, "silver": 0, "copper": 0},
        "items": []
    }'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_character_inventories_character_id ON character_inventories(character_id);
CREATE INDEX IF NOT EXISTS idx_character_inventories_campaign_id ON character_inventories(campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_inventories_inventory ON character_inventories USING GIN (inventory);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for character_inventories
DROP TRIGGER IF EXISTS update_character_inventories_updated_at ON character_inventories;
CREATE TRIGGER update_character_inventories_updated_at
    BEFORE UPDATE ON character_inventories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME / COMBAT SESSIONS (from 05-realtime.sql)
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS room_codes (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add room_code to campaigns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaigns' AND column_name = 'room_code'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN room_code VARCHAR(6) UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_combat_sessions_campaign ON combat_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_sessions_active ON combat_sessions(campaign_id, is_active);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON combat_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_room_codes_code ON room_codes(code);
CREATE INDEX IF NOT EXISTS idx_room_codes_campaign ON room_codes(campaign_id);

-- Ensure only one active session per campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_campaign
ON combat_sessions(campaign_id) WHERE is_active = true;

-- ============================================================================
-- FIGHT PRESETS (from 06-fight-presets.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fight_presets (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_fight_presets_campaign ON fight_presets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fight_preset_monsters_preset ON fight_preset_monsters(preset_id);

-- ============================================================================
-- CONDITIONS (from 07-conditions.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conditions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add conditions column to combat_monsters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'combat_monsters' AND column_name = 'conditions'
    ) THEN
        ALTER TABLE combat_monsters ADD COLUMN conditions JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add exhaustion_level columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'characters' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE characters ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'combat_monsters' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE combat_monsters ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'combat_session_participants' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE combat_session_participants ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;
END $$;

-- Seed conditions (D&D 5e rules in French)
INSERT INTO conditions (id, name, description, icon, color, sort_order) VALUES
('a-terre', 'À terre', 'La seule option de mouvement d''une créature à terre est de ramper, à moins qu''elle ne se relève et mette ainsi fin à son état.', 'arrow-down', 'amber', 1),
('agrippe', 'Agrippé', 'La vitesse d''une créature agrippée devient 0 et elle ne bénéficie d''aucun bonus à sa vitesse.', 'grab', 'orange', 2),
('assourdi', 'Assourdi', 'Une créature assourdie n''entend plus et rate automatiquement tout jet de caractéristique relatif à l''ouïe.', 'ear-off', 'slate', 3),
('aveugle', 'Aveuglé', 'Une créature aveuglée ne voit plus et rate automatiquement tout jet de caractéristique relatif à la vue.', 'eye-off', 'zinc', 4),
('charme', 'Charmé', 'Une créature charmée ne peut pas attaquer celui qui l''a charmée ni le cibler avec des capacités ou effets magiques nuisibles.', 'heart', 'pink', 5),
('effraye', 'Effrayé', 'Une créature effrayée a un désavantage aux jets de caractéristique et d''attaque tant que la source de sa frayeur est dans son champ de vision.', 'ghost', 'purple', 6),
('empoisonne', 'Empoisonné', 'Une créature empoisonnée a un désavantage aux jets d''attaque et de caractéristique.', 'skull', 'green', 7),
('entrave', 'Entravé', 'La vitesse d''une créature entravée devient 0 et elle ne bénéficie d''aucun bonus à sa vitesse.', 'link', 'stone', 8),
('etourdi', 'Étourdi', 'Une créature étourdie est incapable d''agir, ne peut plus bouger et parle de manière hésitante.', 'zap', 'yellow', 9),
('incapable', 'Incapable d''agir', 'Une créature incapable d''agir ne peut effectuer aucune action ni réaction.', 'ban', 'red', 10),
('inconscient', 'Inconscient', 'Une créature inconsciente est incapable d''agir, ne peut plus bouger ni parler et n''est pas consciente de ce qui l''entoure.', 'moon', 'indigo', 11),
('invisible', 'Invisible', 'Une créature invisible ne peut être vue sans l''aide de la magie ou d''un sens spécial.', 'eye', 'cyan', 12),
('paralyse', 'Paralysé', 'Une créature paralysée est incapable d''agir et ne peut ni bouger ni parler.', 'pause', 'blue', 13),
('petrifie', 'Pétrifié', 'Une créature pétrifiée est transformée, avec tous les objets non magiques qu''elle porte, en une substance inanimée solide.', 'mountain', 'gray', 14),
('concentre', 'Concentré', 'La créature maintient sa concentration sur un sort ou un effet.', 'focus', 'sky', 15)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- NOTION SYNC (from 08-notion-sync.sql, 09-notion-tracking.sql)
-- ============================================================================

-- Add unique constraint on monster name for Notion sync upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'monsters_name_key'
    ) THEN
        ALTER TABLE monsters ADD CONSTRAINT monsters_name_key UNIQUE (name);
    END IF;
END $$;

-- Add notion_id column to track monsters synced from Notion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'monsters' AND column_name = 'notion_id'
    ) THEN
        ALTER TABLE monsters ADD COLUMN notion_id TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_monsters_notion_id ON monsters(notion_id) WHERE notion_id IS NOT NULL;

-- ============================================================================
-- SETTINGS (from 10-settings.sql)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaigns' AND column_name = 'dm_password'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN dm_password VARCHAR(255);
    END IF;
END $$;

-- ============================================================================
-- COMBAT HISTORY (from 11-combat-history.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_history (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    final_state JSONB,
    participants JSONB,
    total_rounds INTEGER,
    outcome VARCHAR(50),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS combat_state_backup (
    campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_combat_history_campaign ON combat_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_history_started ON combat_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_combat_state_backup_update ON combat_state_backup(last_update);

COMMENT ON TABLE combat_history IS 'Records of completed combat encounters for history/analytics';
COMMENT ON TABLE combat_state_backup IS 'Backup of active combat state for recovery if Redis fails';

-- ============================================================================
-- PARTICIPANT TYPE (from 12-participant-type.sql)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fight_preset_monsters' AND column_name = 'participant_type'
    ) THEN
        ALTER TABLE fight_preset_monsters ADD COLUMN participant_type VARCHAR(20) NOT NULL DEFAULT 'monster';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fight_preset_monsters' AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE fight_preset_monsters ADD COLUMN reference_id VARCHAR(50);
    END IF;
END $$;
