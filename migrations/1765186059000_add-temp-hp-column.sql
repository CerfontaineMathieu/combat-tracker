-- Add temporary HP column for D&D 5e temporary hit points
ALTER TABLE character_hp ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0;
