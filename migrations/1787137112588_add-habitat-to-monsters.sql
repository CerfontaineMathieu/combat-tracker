-- Add habitat multi-value column to monsters, synced from Notion's Habitat multi-select property
ALTER TABLE monsters ADD COLUMN IF NOT EXISTS habitat TEXT[] DEFAULT '{}';

-- Lookup table of all Habitat options configured in Notion, refreshed on every sync
-- so new options are available in the app even before any monster is tagged with them
CREATE TABLE IF NOT EXISTS habitat_options (
    name TEXT PRIMARY KEY
);
