-- Add notion_id column to track monsters synced from Notion
-- This enables deletion detection and prevents accidental deletion of manually-created monsters

ALTER TABLE monsters ADD COLUMN notion_id TEXT;

-- Create index on notion_id for efficient lookups
-- Partial index only on non-null values to save space
CREATE INDEX idx_monsters_notion_id ON monsters(notion_id) WHERE notion_id IS NOT NULL;
