-- Add condition_durations column to character_hp table
-- This stores the remaining turns for each condition (conditionId -> remaining turns)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_hp' AND column_name = 'condition_durations'
    ) THEN
        ALTER TABLE character_hp ADD COLUMN condition_durations JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
