-- Item catalog table for storing items synced from Notion
CREATE TABLE IF NOT EXISTS item_catalog (
    id SERIAL PRIMARY KEY,
    notion_id TEXT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,        -- 'equipment', 'consumable', 'misc'
    subcategory VARCHAR(100),              -- 'potion', 'fleche', 'parchemin', 'weapon', 'plante', 'poison', etc.
    source_database VARCHAR(100) NOT NULL, -- 'armes', 'objets', 'plantes', 'poisons'
    description TEXT,
    rarity VARCHAR(50),
    properties JSONB DEFAULT '{}'::jsonb,  -- Store all extra Notion properties
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_item_catalog_category ON item_catalog(category);
CREATE INDEX IF NOT EXISTS idx_item_catalog_subcategory ON item_catalog(subcategory);
CREATE INDEX IF NOT EXISTS idx_item_catalog_name ON item_catalog(name);
CREATE INDEX IF NOT EXISTS idx_item_catalog_notion_id ON item_catalog(notion_id);

-- Full-text search index for name and description
CREATE INDEX IF NOT EXISTS idx_item_catalog_search ON item_catalog USING gin(to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, '')));
