-- Migration: Add Loot Distribution System
-- Tables for managing post-combat loot distribution with real-time claiming

-- Loot sessions (one per combat/event)
CREATE TABLE IF NOT EXISTS loot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'claiming'
        CHECK (status IN ('draft', 'claiming', 'resolving', 'completed', 'cancelled')),

    -- Currency pool
    gold INTEGER DEFAULT 0,
    silver INTEGER DEFAULT 0,
    copper INTEGER DEFAULT 0,
    currency_split_method VARCHAR(10) DEFAULT 'equal'
        CHECK (currency_split_method IN ('equal', 'manual')),

    -- Optional timer for claiming phase
    claiming_deadline TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Items in loot pool
CREATE TABLE IF NOT EXISTS loot_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES loot_sessions(id) ON DELETE CASCADE NOT NULL,

    -- Optional reference to item catalog
    catalog_notion_id VARCHAR(255),

    -- Item details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) NOT NULL
        CHECK (item_type IN ('weapon', 'armor', 'potion', 'scroll', 'wondrous', 'currency', 'misc')),
    rarity VARCHAR(20) DEFAULT 'common'
        CHECK (rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),

    quantity INTEGER DEFAULT 1,
    is_identified BOOLEAN DEFAULT true,
    estimated_value_gp INTEGER,

    -- Resolution status
    status VARCHAR(20) DEFAULT 'unclaimed'
        CHECK (status IN ('unclaimed', 'contested', 'assigned', 'treasury', 'sold')),
    assigned_to VARCHAR(255),  -- Character ID (string format like existing system)
    assigned_to_name VARCHAR(255),  -- Denormalized for display

    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Player claims on items
CREATE TABLE IF NOT EXISTS loot_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES loot_items(id) ON DELETE CASCADE NOT NULL,
    character_id VARCHAR(255) NOT NULL,
    character_name VARCHAR(255) NOT NULL,  -- Denormalized for display

    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
    note TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(item_id, character_id)
);

-- Final distributions (history)
CREATE TABLE IF NOT EXISTS loot_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES loot_sessions(id) ON DELETE CASCADE NOT NULL,
    character_id VARCHAR(255) NOT NULL,
    character_name VARCHAR(255) NOT NULL,

    gold_received INTEGER DEFAULT 0,
    silver_received INTEGER DEFAULT 0,
    copper_received INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items in each distribution
CREATE TABLE IF NOT EXISTS loot_distribution_items (
    distribution_id UUID REFERENCES loot_distributions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES loot_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (distribution_id, item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_loot_sessions_campaign ON loot_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_loot_sessions_status ON loot_sessions(status);
CREATE INDEX IF NOT EXISTS idx_loot_items_session ON loot_items(session_id);
CREATE INDEX IF NOT EXISTS idx_loot_items_status ON loot_items(status);
CREATE INDEX IF NOT EXISTS idx_loot_claims_item ON loot_claims(item_id);
CREATE INDEX IF NOT EXISTS idx_loot_claims_character ON loot_claims(character_id);
CREATE INDEX IF NOT EXISTS idx_loot_distributions_session ON loot_distributions(session_id);
