-- Migration: add-xp-to-presets
-- Description: Add XP column to fight_preset_monsters for storing monster XP in presets

-- Add xp column to fight_preset_monsters table
ALTER TABLE fight_preset_monsters ADD COLUMN IF NOT EXISTS xp INTEGER;

-- Comment for documentation
COMMENT ON COLUMN fight_preset_monsters.xp IS 'XP value for the monster (from challenge_rating_xp)';
