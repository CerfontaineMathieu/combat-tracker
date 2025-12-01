-- Add unique constraint on monster name for Notion sync upsert
ALTER TABLE monsters ADD CONSTRAINT monsters_name_key UNIQUE (name);
