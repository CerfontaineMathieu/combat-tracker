-- Add participant_type column to fight_preset_monsters
-- This allows distinguishing between players and monsters when loading presets

ALTER TABLE fight_preset_monsters
ADD COLUMN IF NOT EXISTS participant_type VARCHAR(20) NOT NULL DEFAULT 'monster';

-- Add reference_id to store the original player/monster ID
ALTER TABLE fight_preset_monsters
ADD COLUMN IF NOT EXISTS reference_id VARCHAR(50);
