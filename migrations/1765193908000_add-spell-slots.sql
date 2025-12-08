-- Add spell_slots column to character_hp table
-- Stores current available spell slots as JSONB {"1": 4, "2": 3, ...}
ALTER TABLE character_hp ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT '{}'::jsonb;
