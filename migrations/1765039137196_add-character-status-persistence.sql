-- Add exhaustion_level and conditions columns to character_hp table
-- This extends the existing character_hp table with status persistence

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_hp' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE character_hp ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_hp' AND column_name = 'conditions'
    ) THEN
        ALTER TABLE character_hp ADD COLUMN conditions JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
