-- Migration: add-reactions
-- Description: Adds reactions JSONB column to monsters table for storing reaction abilities

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'monsters' AND column_name = 'reactions'
    ) THEN
        ALTER TABLE monsters ADD COLUMN reactions JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added reactions column to monsters table';
    ELSE
        RAISE NOTICE 'reactions column already exists';
    END IF;
END $$;

-- Add index for reactions
CREATE INDEX IF NOT EXISTS idx_monsters_reactions ON monsters USING GIN (reactions);
